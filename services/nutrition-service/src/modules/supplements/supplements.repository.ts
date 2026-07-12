import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { Supplement } from "@platform/prisma-client";

import type {
  CreateSupplementDto,
  SupplementIntakeResponseDto,
  SupplementResponseDto,
} from "./dto/supplement-dtos";

@Injectable()
export class SupplementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateSupplementDto,
  ): Promise<SupplementResponseDto> {
    const row = await this.prisma.supplement.create({
      data: { user_id: userId, ...dto },
    });
    return this.toDto(row);
  }

  async listActive(userId: string): Promise<SupplementResponseDto[]> {
    const rows = await this.prisma.supplement.findMany({
      where: { user_id: userId, active: true },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOwned(
    userId: string,
    id: string,
  ): Promise<SupplementResponseDto | null> {
    const row = await this.prisma.supplement.findFirst({
      where: { id, user_id: userId },
    });
    return row ? this.toDto(row) : null;
  }

  /** Deactivate instead of delete — the intake history stays readable. */
  async deactivate(id: string): Promise<void> {
    await this.prisma.supplement.update({
      where: { id },
      data: { active: false },
    });
  }

  async logIntake(
    userId: string,
    supplementId: string,
    takenAt?: Date,
  ): Promise<SupplementIntakeResponseDto> {
    const row = await this.prisma.supplementIntake.create({
      data: {
        user_id: userId,
        supplement_id: supplementId,
        ...(takenAt ? { taken_at: takenAt } : {}),
      },
      include: { supplement: { select: { name: true } } },
    });
    return {
      id: row.id,
      supplement_id: row.supplement_id,
      supplement_name: row.supplement.name,
      taken_at: row.taken_at,
    };
  }

  async listIntakes(
    userId: string,
    supplementId: string,
    limit = 100,
  ): Promise<SupplementIntakeResponseDto[]> {
    const rows = await this.prisma.supplementIntake.findMany({
      where: { user_id: userId, supplement_id: supplementId },
      include: { supplement: { select: { name: true } } },
      orderBy: { taken_at: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      supplement_id: r.supplement_id,
      supplement_name: r.supplement.name,
      taken_at: r.taken_at,
    }));
  }

  private toDto(row: Supplement): SupplementResponseDto {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      dosage: row.dosage,
      times: row.times,
      active: row.active,
      created_at: row.created_at,
    };
  }
}
