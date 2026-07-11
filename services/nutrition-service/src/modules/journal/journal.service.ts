import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventBusService } from "@platform/events";

import { FoodsRepository } from "../foods/foods.repository";
import { JournalRepository } from "./journal.repository";
import { computeEntryNutrition } from "./compute-entry-nutrition";
import {
  MEALS,
  type CreateJournalEntryDto,
} from "./dto/create-journal-entry.dto";
import type {
  JournalDayResponseDto,
  JournalEntryResponseDto,
} from "./dto/journal-response.dto";

const round1 = (n: number): number => Math.round(n * 10) / 10;

@Injectable()
export class JournalService {
  constructor(
    private readonly repo: JournalRepository,
    private readonly foods: FoodsRepository,
    private readonly events: EventBusService,
  ) {}

  async log(
    userId: string,
    dto: CreateJournalEntryDto,
  ): Promise<JournalEntryResponseDto> {
    const food = await this.foods.findById(dto.food_item_id);
    if (!food) {
      throw new NotFoundException({
        code: "FOOD_NOT_FOUND",
        message: "Food not found",
      });
    }
    // Another user's custom food is private; OFF-cache rows are global.
    if (food.owner_id && food.owner_id !== userId) {
      throw new ForbiddenException({
        code: "FOOD_NOT_ACCESSIBLE",
        message: "This food belongs to another user",
      });
    }
    const nutrition = computeEntryNutrition(food, dto.quantity_g);
    const entry = await this.repo.create(
      userId,
      dto.food_item_id,
      dto.meal,
      dto.quantity_g,
      this.parseDay(dto.eaten_on),
      nutrition,
    );
    await this.events.publish("journal.entry_logged", {
      user_id: userId,
      entry_id: entry.id,
      meal: entry.meal,
      kcal: entry.kcal,
      eaten_on: entry.eaten_on,
    });
    return entry;
  }

  /** The daily journal: entries grouped by meal + day totals. */
  async day(userId: string, date?: string): Promise<JournalDayResponseDto> {
    const day = this.parseDay(date);
    const entries = await this.repo.listForDay(userId, day);
    const meals: Record<string, JournalEntryResponseDto[]> = {};
    for (const meal of MEALS) meals[meal] = [];
    const totals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    for (const e of entries) {
      (meals[e.meal] ??= []).push(e);
      totals.kcal += e.kcal;
      totals.protein_g += e.protein_g;
      totals.carbs_g += e.carbs_g;
      totals.fat_g += e.fat_g;
    }
    return {
      date: day.toISOString().slice(0, 10),
      meals,
      totals: {
        kcal: Math.round(totals.kcal),
        protein_g: round1(totals.protein_g),
        carbs_g: round1(totals.carbs_g),
        fat_g: round1(totals.fat_g),
      },
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    const entry = await this.repo.findOwned(userId, id);
    if (!entry) {
      throw new NotFoundException({
        code: "JOURNAL_ENTRY_NOT_FOUND",
        message: "Journal entry not found",
      });
    }
    await this.repo.delete(id);
  }

  /** Normalise to a UTC midnight DATE; defaults to today. */
  private parseDay(iso?: string): Date {
    const s = iso ?? new Date().toISOString();
    return new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
  }
}
