import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { HydrationEntry } from "@platform/prisma-client";

import type { HydrationEntryResponseDto } from "./dto/hydration-dtos";

@Injectable()
export class HydrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    amountMl: number,
    drunkAt?: Date,
  ): Promise<HydrationEntryResponseDto> {
    const row = await this.prisma.hydrationEntry.create({
      data: {
        user_id: userId,
        amount_ml: amountMl,
        ...(drunkAt ? { drunk_at: drunkAt } : {}),
      },
    });
    return this.toDto(row);
  }

  /** Entries inside one UTC day, oldest first. */
  async listForDay(
    userId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<HydrationEntryResponseDto[]> {
    const rows = await this.prisma.hydrationEntry.findMany({
      where: { user_id: userId, drunk_at: { gte: dayStart, lt: dayEnd } },
      orderBy: { drunk_at: "asc" },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOwned(
    userId: string,
    id: string,
  ): Promise<HydrationEntryResponseDto | null> {
    const row = await this.prisma.hydrationEntry.findFirst({
      where: { id, user_id: userId },
    });
    return row ? this.toDto(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.hydrationEntry.delete({ where: { id } });
  }

  private toDto(row: HydrationEntry): HydrationEntryResponseDto {
    return {
      id: row.id,
      user_id: row.user_id,
      amount_ml: row.amount_ml,
      drunk_at: row.drunk_at,
      created_at: row.created_at,
    };
  }
}
