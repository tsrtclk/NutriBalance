import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { Profile } from "@platform/prisma-client";

import type { ProfileResponseDto } from "./dto/profile-response.dto";
import type { UpsertProfileDto } from "./dto/upsert-profile.dto";

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<ProfileResponseDto | null> {
    const row = await this.prisma.profile.findUnique({
      where: { user_id: userId },
    });
    return row ? this.toDto(row) : null;
  }

  async upsert(
    userId: string,
    dto: UpsertProfileDto,
  ): Promise<ProfileResponseDto> {
    const data = {
      sex: dto.sex,
      birth_date: new Date(dto.birth_date),
      height_cm: dto.height_cm,
      weight_kg: dto.weight_kg,
      activity_level: dto.activity_level,
      goal: dto.goal,
      target_weight_kg: dto.target_weight_kg ?? null,
      target_date: dto.target_date ? new Date(dto.target_date) : null,
      training_level: dto.training_level ?? null,
      equipment: dto.equipment ?? null,
    };
    const row = await this.prisma.profile.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...data },
      update: data,
    });
    return this.toDto(row);
  }

  async updateCurrentWeight(userId: string, weightKg: number): Promise<void> {
    await this.prisma.profile.updateMany({
      where: { user_id: userId },
      data: { weight_kg: weightKg },
    });
  }

  /** Prisma Decimals and DATE columns are converted at this boundary. */
  private toDto(row: Profile): ProfileResponseDto {
    return {
      id: row.id,
      user_id: row.user_id,
      sex: row.sex,
      birth_date: row.birth_date.toISOString().slice(0, 10),
      height_cm: Number(row.height_cm),
      weight_kg: Number(row.weight_kg),
      activity_level: row.activity_level,
      goal: row.goal,
      target_weight_kg:
        row.target_weight_kg == null ? null : Number(row.target_weight_kg),
      target_date: row.target_date
        ? row.target_date.toISOString().slice(0, 10)
        : null,
      training_level: row.training_level,
      equipment: row.equipment,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
