import { Injectable, NotFoundException } from "@nestjs/common";
import { EventBusService } from "@platform/events";

import { HydrationRepository } from "./hydration.repository";
import type {
  CreateHydrationEntryDto,
  HydrationDayResponseDto,
  HydrationEntryResponseDto,
} from "./dto/hydration-dtos";

const DAY_MS = 24 * 3600 * 1000;

@Injectable()
export class HydrationService {
  constructor(
    private readonly repo: HydrationRepository,
    private readonly events: EventBusService,
  ) {}

  async log(
    userId: string,
    dto: CreateHydrationEntryDto,
  ): Promise<HydrationEntryResponseDto> {
    const entry = await this.repo.create(
      userId,
      dto.amount_ml,
      dto.drunk_at ? new Date(dto.drunk_at) : undefined,
    );
    await this.events.publish("hydration.logged", {
      user_id: userId,
      amount_ml: entry.amount_ml,
      drunk_at: entry.drunk_at.toISOString(),
    });
    return entry;
  }

  async day(userId: string, date?: string): Promise<HydrationDayResponseDto> {
    const dayStart = this.parseDayStart(date);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const entries = await this.repo.listForDay(userId, dayStart, dayEnd);
    return {
      date: dayStart.toISOString().slice(0, 10),
      total_ml: entries.reduce((sum, e) => sum + e.amount_ml, 0),
      entries,
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    const entry = await this.repo.findOwned(userId, id);
    if (!entry) {
      throw new NotFoundException({
        code: "HYDRATION_ENTRY_NOT_FOUND",
        message: "Hydration entry not found",
      });
    }
    await this.repo.delete(id);
  }

  /** UTC midnight of the requested (or current) day. */
  private parseDayStart(iso?: string): Date {
    const s = iso ?? new Date().toISOString();
    return new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
  }
}
