import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { WeightEntry } from "@platform/prisma-client";

import type { WeightEntryResponseDto } from "./dto/weight-entry-response.dto";

@Injectable()
export class WeightRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    weightKg: number,
    measuredAt?: Date,
  ): Promise<WeightEntryResponseDto> {
    const row = await this.prisma.weightEntry.create({
      data: {
        user_id: userId,
        weight_kg: weightKg,
        ...(measuredAt ? { measured_at: measuredAt } : {}),
      },
    });
    return this.toDto(row);
  }

  /** The curve: ascending by measurement time, optionally range-bounded. */
  async list(
    userId: string,
    from?: Date,
    to?: Date,
    limit = 500,
  ): Promise<WeightEntryResponseDto[]> {
    const rows = await this.prisma.weightEntry.findMany({
      where: {
        user_id: userId,
        ...(from || to
          ? {
              measured_at: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      orderBy: { measured_at: "asc" },
      take: limit,
    });
    return rows.map((r) => this.toDto(r));
  }

  async latest(userId: string): Promise<WeightEntryResponseDto | null> {
    const row = await this.prisma.weightEntry.findFirst({
      where: { user_id: userId },
      orderBy: { measured_at: "desc" },
    });
    return row ? this.toDto(row) : null;
  }

  private toDto(row: WeightEntry): WeightEntryResponseDto {
    return {
      id: row.id,
      user_id: row.user_id,
      weight_kg: Number(row.weight_kg),
      measured_at: row.measured_at,
      created_at: row.created_at,
    };
  }
}
