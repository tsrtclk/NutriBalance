import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { JournalEntry } from "@platform/prisma-client";

import type { EntryNutrition } from "./compute-entry-nutrition";
import type { Meal } from "./dto/create-journal-entry.dto";
import type { JournalEntryResponseDto } from "./dto/journal-response.dto";

type EntryWithFood = JournalEntry & { food_item: { name: string } };

@Injectable()
export class JournalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    foodItemId: string,
    meal: Meal,
    quantityG: number,
    eatenOn: Date,
    nutrition: EntryNutrition,
  ): Promise<JournalEntryResponseDto> {
    const row = await this.prisma.journalEntry.create({
      data: {
        user_id: userId,
        food_item_id: foodItemId,
        meal,
        quantity_g: quantityG,
        eaten_on: eatenOn,
        ...nutrition,
      },
      include: { food_item: { select: { name: true } } },
    });
    return this.toDto(row);
  }

  async listForDay(
    userId: string,
    day: Date,
  ): Promise<JournalEntryResponseDto[]> {
    const rows = await this.prisma.journalEntry.findMany({
      where: { user_id: userId, eaten_on: day },
      include: { food_item: { select: { name: true } } },
      orderBy: { created_at: "asc" },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOwned(
    userId: string,
    id: string,
  ): Promise<JournalEntryResponseDto | null> {
    const row = await this.prisma.journalEntry.findFirst({
      where: { id, user_id: userId },
      include: { food_item: { select: { name: true } } },
    });
    return row ? this.toDto(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.journalEntry.delete({ where: { id } });
  }

  /** Prisma Decimals and the DATE column are converted at this boundary. */
  private toDto(row: EntryWithFood): JournalEntryResponseDto {
    return {
      id: row.id,
      user_id: row.user_id,
      food_item_id: row.food_item_id,
      food_name: row.food_item.name,
      meal: row.meal,
      quantity_g: Number(row.quantity_g),
      eaten_on: row.eaten_on.toISOString().slice(0, 10),
      kcal: Number(row.kcal),
      protein_g: Number(row.protein_g),
      carbs_g: Number(row.carbs_g),
      fat_g: Number(row.fat_g),
      created_at: row.created_at,
    };
  }
}
