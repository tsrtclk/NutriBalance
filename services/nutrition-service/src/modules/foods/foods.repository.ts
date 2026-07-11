import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { FoodItem } from "@platform/prisma-client";

import type { ProviderFood } from "./provider/food-data.provider";
import type { CreateFoodDto } from "./dto/create-food.dto";
import type { FoodResponseDto } from "./dto/food-response.dto";

@Injectable()
export class FoodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<FoodResponseDto | null> {
    const row = await this.prisma.foodItem.findUnique({ where: { id } });
    return row ? this.toDto(row) : null;
  }

  async findByBarcode(barcode: string): Promise<FoodResponseDto | null> {
    const row = await this.prisma.foodItem.findUnique({
      where: { off_barcode: barcode },
    });
    return row ? this.toDto(row) : null;
  }

  /** Local search: the user's custom foods + the global OFF cache. */
  async searchLocal(
    userId: string,
    query: string,
    limit = 20,
  ): Promise<FoodResponseDto[]> {
    const rows = await this.prisma.foodItem.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        OR: [{ owner_id: userId }, { owner_id: null }],
      },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((r) => this.toDto(r));
  }

  async createCustom(
    userId: string,
    dto: CreateFoodDto,
  ): Promise<FoodResponseDto> {
    const row = await this.prisma.foodItem.create({
      data: { source: "custom", owner_id: userId, ...dto },
    });
    return this.toDto(row);
  }

  /** Cache a provider hit; idempotent on barcode (refreshes nutrition). */
  async upsertFromProvider(food: ProviderFood): Promise<FoodResponseDto> {
    const data = {
      name: food.name,
      brand: food.brand ?? null,
      kcal_per_100g: food.kcal_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
      serving_size_g: food.serving_size_g ?? null,
    };
    const row = await this.prisma.foodItem.upsert({
      where: { off_barcode: food.barcode },
      create: { source: "off", off_barcode: food.barcode, ...data },
      update: data,
    });
    return this.toDto(row);
  }

  async listFavorites(userId: string): Promise<FoodResponseDto[]> {
    const rows = await this.prisma.favoriteFood.findMany({
      where: { user_id: userId },
      include: { food_item: true },
      orderBy: { created_at: "desc" },
    });
    return rows.map((r) => this.toDto(r.food_item));
  }

  async addFavorite(userId: string, foodItemId: string): Promise<void> {
    await this.prisma.favoriteFood.upsert({
      where: {
        user_id_food_item_id: { user_id: userId, food_item_id: foodItemId },
      },
      create: { user_id: userId, food_item_id: foodItemId },
      update: {},
    });
  }

  async removeFavorite(userId: string, foodItemId: string): Promise<void> {
    await this.prisma.favoriteFood.deleteMany({
      where: { user_id: userId, food_item_id: foodItemId },
    });
  }

  /** Most recently journaled distinct foods (the "recents" quick-add list). */
  async listRecent(userId: string, limit = 10): Promise<FoodResponseDto[]> {
    const entries = await this.prisma.journalEntry.findMany({
      where: { user_id: userId },
      include: { food_item: true },
      orderBy: { created_at: "desc" },
      take: limit * 5,
    });
    const seen = new Set<string>();
    const foods: FoodResponseDto[] = [];
    for (const e of entries) {
      if (seen.has(e.food_item_id)) continue;
      seen.add(e.food_item_id);
      foods.push(this.toDto(e.food_item));
      if (foods.length >= limit) break;
    }
    return foods;
  }

  /** Prisma Decimals are converted at this boundary. */
  private toDto(row: FoodItem): FoodResponseDto {
    return {
      id: row.id,
      source: row.source,
      off_barcode: row.off_barcode,
      owner_id: row.owner_id,
      name: row.name,
      brand: row.brand,
      kcal_per_100g: Number(row.kcal_per_100g),
      protein_per_100g: Number(row.protein_per_100g),
      carbs_per_100g: Number(row.carbs_per_100g),
      fat_per_100g: Number(row.fat_per_100g),
      serving_size_g:
        row.serving_size_g == null ? null : Number(row.serving_size_g),
      created_at: row.created_at,
    };
  }
}
