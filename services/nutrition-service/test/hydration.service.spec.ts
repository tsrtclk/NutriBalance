import { NotFoundException } from "@nestjs/common";

import { HydrationService } from "../src/modules/hydration/hydration.service";
import type { HydrationRepository } from "../src/modules/hydration/hydration.repository";
import type { HydrationEntryResponseDto } from "../src/modules/hydration/dto/hydration-dtos";

const ALICE = "00000000-0000-4000-8000-000000000001";
const BOB = "00000000-0000-4000-8000-000000000002";

class FakeHydrationRepo {
  entries: HydrationEntryResponseDto[] = [];
  private seq = 0;

  async create(userId: string, amountMl: number, drunkAt?: Date) {
    const entry: HydrationEntryResponseDto = {
      id: `00000000-0000-4000-8000-00000000020${this.seq++}`,
      user_id: userId,
      amount_ml: amountMl,
      drunk_at: drunkAt ?? new Date("2026-07-12T09:00:00Z"),
      created_at: new Date(),
    };
    this.entries.push(entry);
    return entry;
  }

  async listForDay(userId: string, dayStart: Date, dayEnd: Date) {
    return this.entries.filter(
      (e) =>
        e.user_id === userId && e.drunk_at >= dayStart && e.drunk_at < dayEnd,
    );
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

function makeService() {
  const repo = new FakeHydrationRepo();
  const events = { publish: jest.fn().mockResolvedValue(undefined) };
  const service = new HydrationService(
    repo as unknown as HydrationRepository,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events as any,
  );
  return { service, repo, events };
}

describe("HydrationService", () => {
  it("sums the day's entries and emits hydration.logged", async () => {
    const { service, events } = makeService();
    await service.log(ALICE, {
      amount_ml: 250,
      drunk_at: "2026-07-12T08:00:00Z",
    });
    await service.log(ALICE, {
      amount_ml: 500,
      drunk_at: "2026-07-12T12:00:00Z",
    });
    // Another day and another user must not leak into the total.
    await service.log(ALICE, {
      amount_ml: 999,
      drunk_at: "2026-07-11T12:00:00Z",
    });
    await service.log(BOB, {
      amount_ml: 400,
      drunk_at: "2026-07-12T12:00:00Z",
    });

    const day = await service.day(ALICE, "2026-07-12");
    expect(day.total_ml).toBe(750);
    expect(day.entries).toHaveLength(2);
    expect(events.publish).toHaveBeenCalledWith(
      "hydration.logged",
      expect.objectContaining({ user_id: ALICE, amount_ml: 250 }),
    );
  });

  it("an empty day totals zero", async () => {
    const { service } = makeService();
    const day = await service.day(ALICE, "2026-07-12");
    expect(day.total_ml).toBe(0);
    expect(day.entries).toEqual([]);
  });

  it("only deletes the caller's own entries", async () => {
    const { service } = makeService();
    const entry = await service.log(ALICE, { amount_ml: 250 });
    await expect(service.remove(BOB, entry.id)).rejects.toThrow(
      NotFoundException,
    );
    await service.remove(ALICE, entry.id);
    const day = await service.day(ALICE, "2026-07-12");
    expect(day.total_ml).toBe(0);
  });
});
