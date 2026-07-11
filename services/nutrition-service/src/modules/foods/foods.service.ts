import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EventBusService } from "@platform/events";

import { FoodsRepository } from "./foods.repository";
import {
  FOOD_DATA_PROVIDER,
  type FoodDataProvider,
} from "./provider/food-data.provider";
import type { CreateFoodDto } from "./dto/create-food.dto";
import type { FoodResponseDto } from "./dto/food-response.dto";

@Injectable()
export class FoodsService {
  constructor(
    private readonly repo: FoodsRepository,
    @Inject(FOOD_DATA_PROVIDER) private readonly provider: FoodDataProvider,
    private readonly events: EventBusService,
  ) {}

  /**
   * Local (custom + OFF cache) matches first, then provider hits. Provider
   * results are upserted into the cache so every returned food has a stable
   * id the journal can reference.
   */
  async search(userId: string, query: string): Promise<FoodResponseDto[]> {
    const local = await this.repo.searchLocal(userId, query);
    const providerHits = await this.provider.searchByName(query);
    const cachedBarcodes = new Set(
      local.map((f) => f.off_barcode).filter(Boolean),
    );
    const fresh: FoodResponseDto[] = [];
    for (const hit of providerHits) {
      if (cachedBarcodes.has(hit.barcode)) continue;
      fresh.push(await this.repo.upsertFromProvider(hit));
    }
    return [...local, ...fresh];
  }

  /** É3 barcode scan: cache-first, then the provider (cached on hit). */
  async byBarcode(barcode: string): Promise<FoodResponseDto> {
    const cached = await this.repo.findByBarcode(barcode);
    if (cached) return cached;
    const hit = await this.provider.getByBarcode(barcode);
    if (!hit) {
      throw new NotFoundException({
        code: "FOOD_NOT_FOUND",
        message: "No food found for this barcode",
      });
    }
    return this.repo.upsertFromProvider(hit);
  }

  async createCustom(
    userId: string,
    dto: CreateFoodDto,
  ): Promise<FoodResponseDto> {
    const food = await this.repo.createCustom(userId, dto);
    await this.events.publish("food.created", {
      id: food.id,
      owner_id: userId,
      name: food.name,
    });
    return food;
  }

  favorites(userId: string): Promise<FoodResponseDto[]> {
    return this.repo.listFavorites(userId);
  }

  async addFavorite(userId: string, foodItemId: string): Promise<void> {
    const food = await this.repo.findById(foodItemId);
    if (!food) {
      throw new NotFoundException({
        code: "FOOD_NOT_FOUND",
        message: "Food not found",
      });
    }
    await this.repo.addFavorite(userId, foodItemId);
  }

  removeFavorite(userId: string, foodItemId: string): Promise<void> {
    return this.repo.removeFavorite(userId, foodItemId);
  }

  recent(userId: string): Promise<FoodResponseDto[]> {
    return this.repo.listRecent(userId);
  }
}
