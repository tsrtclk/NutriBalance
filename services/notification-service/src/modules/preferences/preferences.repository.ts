import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { NotificationPreference } from "@platform/prisma-client";

import type {
  PreferencesResponseDto,
  UpdatePreferencesDto,
} from "./dto/preferences-dtos";

/** Mirrors the schema defaults — returned when no row exists yet. */
export const DEFAULT_PREFERENCES: Omit<PreferencesResponseDto, "user_id"> = {
  meals_enabled: true,
  meal_times: ["08:00", "12:30", "19:30"],
  hydration_enabled: true,
  hydration_every_min: 120,
  supplements_enabled: true,
  workout_enabled: true,
  workout_time: "18:00",
  goal_alerts_enabled: true,
};

@Injectable()
export class PreferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<PreferencesResponseDto> {
    const row = await this.prisma.notificationPreference.findUnique({
      where: { user_id: userId },
    });
    return row ? this.toDto(row) : { user_id: userId, ...DEFAULT_PREFERENCES };
  }

  async upsert(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<PreferencesResponseDto> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...dto },
      update: dto,
    });
    return this.toDto(row);
  }

  /** Everyone with a stored row — the scheduler's candidate set. Users
   * without a row get the defaults applied lazily on their first PUT
   * (backlog: B18 — fire default reminders for row-less users too). */
  async listAll(): Promise<PreferencesResponseDto[]> {
    const rows = await this.prisma.notificationPreference.findMany();
    return rows.map((r) => this.toDto(r));
  }

  private toDto(row: NotificationPreference): PreferencesResponseDto {
    return {
      user_id: row.user_id,
      meals_enabled: row.meals_enabled,
      meal_times: row.meal_times,
      hydration_enabled: row.hydration_enabled,
      hydration_every_min: row.hydration_every_min,
      supplements_enabled: row.supplements_enabled,
      workout_enabled: row.workout_enabled,
      workout_time: row.workout_time,
      goal_alerts_enabled: row.goal_alerts_enabled,
    };
  }
}
