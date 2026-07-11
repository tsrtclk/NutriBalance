import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { JournalService } from "../src/modules/journal/journal.service";
import type { JournalRepository } from "../src/modules/journal/journal.repository";
import type { FoodsRepository } from "../src/modules/foods/foods.repository";
import type { EntryNutrition } from "../src/modules/journal/compute-entry-nutrition";
import type { Meal } from "../src/modules/journal/dto/create-journal-entry.dto";
import type { JournalEntryResponseDto } from "../src/modules/journal/dto/journal-response.dto";
import type { FoodResponseDto } from "../src/modules/foods/dto/food-response.dto";

const OWNER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

function food(partial: Partial<FoodResponseDto>): FoodResponseDto {
  return {
    id: "00000000-0000-4000-8000-0000000000f0",
    source: "custom",
    off_barcode: null,
    owner_id: null,
    name: "Test food",
    brand: null,
    kcal_per_100g: 200,
    protein_per_100g: 10,
    carbs_per_100g: 20,
    fat_per_100g: 5,
    serving_size_g: null,
    created_at: new Date(),
    ...partial,
  };
}

class FakeJournalRepo {
  entries: JournalEntryResponseDto[] = [];
  private seq = 0;

  async create(
    userId: string,
    foodItemId: string,
    meal: Meal,
    quantityG: number,
    eatenOn: Date,
    nutrition: EntryNutrition,
  ): Promise<JournalEntryResponseDto> {
    const entry: JournalEntryResponseDto = {
      id: `00000000-0000-4000-8000-00000000010${this.seq++}`,
      user_id: userId,
      food_item_id: foodItemId,
      food_name: "Test food",
      meal,
      quantity_g: quantityG,
      eaten_on: eatenOn.toISOString().slice(0, 10),
      ...nutrition,
      created_at: new Date(),
    };
    this.entries.push(entry);
    return entry;
  }

  async listForDay(userId: string, day: Date) {
    const d = day.toISOString().slice(0, 10);
    return this.entries.filter((e) => e.user_id === userId && e.eaten_on === d);
  }

  async findOwned(userId: string, id: string) {
    return (
      this.entries.find((e) => e.id === id && e.user_id === userId) ?? null
    );
  }

  async delete(id: string) {
    this.entries = this.entries.filter((e) => e.id !== id);
  }
}

function makeService(foodRow: FoodResponseDto | null) {
  const repo = new FakeJournalRepo();
  const foods = { findById: jest.fn().mockResolvedValue(foodRow) };
  const events = { publish: jest.fn().mockResolvedValue(undefined) };
  const service = new JournalService(
    repo as unknown as JournalRepository,
    foods as unknown as FoodsRepository,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events as any,
  );
  return { service, repo, events };
}

describe("JournalService", () => {
  it("snapshots nutrition at log time and emits journal.entry_logged", async () => {
    const { service, events } = makeService(food({}));
    const entry = await service.log(OWNER, {
      food_item_id: "00000000-0000-4000-8000-0000000000f0",
      meal: "lunch",
      quantity_g: 150,
      eaten_on: "2026-07-11",
    });
    expect(entry.kcal).toBe(300); // 200 × 1.5
    expect(entry.protein_g).toBe(15);
    expect(entry.eaten_on).toBe("2026-07-11");
    expect(events.publish).toHaveBeenCalledWith(
      "journal.entry_logged",
      expect.objectContaining({ user_id: OWNER, kcal: 300 }),
    );
  });

  it("rejects logging an unknown food", async () => {
    const { service } = makeService(null);
    await expect(
      service.log(OWNER, {
        food_item_id: "00000000-0000-4000-8000-0000000000f0",
        meal: "lunch",
        quantity_g: 100,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects logging another user's private custom food", async () => {
    const { service } = makeService(food({ owner_id: OTHER }));
    await expect(
      service.log(OWNER, {
        food_item_id: "00000000-0000-4000-8000-0000000000f0",
        meal: "dinner",
        quantity_g: 100,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("groups the day by meal and sums totals", async () => {
    const { service } = makeService(food({}));
    await service.log(OWNER, {
      food_item_id: "00000000-0000-4000-8000-0000000000f0",
      meal: "breakfast",
      quantity_g: 100,
      eaten_on: "2026-07-11",
    });
    await service.log(OWNER, {
      food_item_id: "00000000-0000-4000-8000-0000000000f0",
      meal: "lunch",
      quantity_g: 200,
      eaten_on: "2026-07-11",
    });
    const day = await service.day(OWNER, "2026-07-11");
    expect(day.meals.breakfast).toHaveLength(1);
    expect(day.meals.lunch).toHaveLength(1);
    expect(day.meals.dinner).toHaveLength(0);
    expect(day.totals.kcal).toBe(600); // 200 + 400
    expect(day.totals.protein_g).toBe(30);
  });

  it("only deletes the caller's own entries", async () => {
    const { service } = makeService(food({}));
    const entry = await service.log(OWNER, {
      food_item_id: "00000000-0000-4000-8000-0000000000f0",
      meal: "snack",
      quantity_g: 50,
      eaten_on: "2026-07-11",
    });
    await expect(service.remove(OTHER, entry.id)).rejects.toThrow(
      NotFoundException,
    );
    await service.remove(OWNER, entry.id);
    const day = await service.day(OWNER, "2026-07-11");
    expect(day.totals.kcal).toBe(0);
  });
});
