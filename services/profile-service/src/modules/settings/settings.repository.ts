import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { HeightUnit, WeightUnit } from "@platform/domain";

import type { SettingsResponseDto } from "./dto/settings-dtos";

/** É12 — absent row = defaults; the row is materialised on first PUT. */
const DEFAULTS: SettingsResponseDto = { weight_unit: "kg", height_unit: "cm" };

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<SettingsResponseDto> {
    const row = await this.prisma.userSettings.findUnique({
      where: { user_id: userId },
    });
    if (!row) return { ...DEFAULTS };
    return {
      weight_unit: row.weight_unit as WeightUnit,
      height_unit: row.height_unit as HeightUnit,
    };
  }

  async upsert(
    userId: string,
    patch: { weight_unit?: WeightUnit; height_unit?: HeightUnit },
  ): Promise<SettingsResponseDto> {
    const row = await this.prisma.userSettings.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...patch },
      update: patch,
    });
    return {
      weight_unit: row.weight_unit as WeightUnit,
      height_unit: row.height_unit as HeightUnit,
    };
  }
}
