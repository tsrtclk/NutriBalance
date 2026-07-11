import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { type AxiosInstance } from "axios";

import type { AppConfig } from "../../../config/configuration";
import type { FoodDataProvider, ProviderFood } from "./food-data.provider";

interface OffNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: OffNutriments;
}

const OFF_FIELDS = "code,product_name,brands,serving_quantity,nutriments";

/**
 * OpenFoodFacts implementation of the FoodDataProvider port (backlog: D3).
 * Best-effort: any upstream failure logs a warning and returns empty/null so
 * local foods keep working through an OFF outage.
 */
@Injectable()
export class OpenFoodFactsProvider implements FoodDataProvider {
  private readonly logger = new Logger(OpenFoodFactsProvider.name);
  private readonly http: AxiosInstance;

  constructor(config: ConfigService<AppConfig, true>) {
    const off = config.get("openFoodFacts", { infer: true });
    this.http = axios.create({
      baseURL: off.baseUrl,
      timeout: off.timeoutMs,
      headers: { "User-Agent": "NutriBalance/0.1 (nutrition-service)" },
    });
  }

  async searchByName(query: string, limit = 10): Promise<ProviderFood[]> {
    try {
      const res = await this.http.get("/cgi/search.pl", {
        params: {
          search_terms: query,
          search_simple: 1,
          action: "process",
          json: 1,
          page_size: limit,
          fields: OFF_FIELDS,
        },
      });
      const products: OffProduct[] = res.data?.products ?? [];
      return products
        .map((p) => this.toProviderFood(p))
        .filter((f): f is ProviderFood => f !== null);
    } catch (e) {
      this.logger.warn(`OFF search failed for "${query}": ${e}`);
      return [];
    }
  }

  async getByBarcode(barcode: string): Promise<ProviderFood | null> {
    try {
      const res = await this.http.get(
        `/api/v2/product/${encodeURIComponent(barcode)}.json`,
        { params: { fields: OFF_FIELDS } },
      );
      if (res.data?.status !== 1 || !res.data?.product) return null;
      return this.toProviderFood({ code: barcode, ...res.data.product });
    } catch (e) {
      this.logger.warn(`OFF barcode lookup failed for ${barcode}: ${e}`);
      return null;
    }
  }

  /** Products without a barcode or kcal figure are unusable — drop them. */
  private toProviderFood(p: OffProduct): ProviderFood | null {
    const kcal = p.nutriments?.["energy-kcal_100g"];
    if (!p.code || !p.product_name || kcal == null) return null;
    const serving = Number(p.serving_quantity);
    return {
      barcode: p.code,
      name: p.product_name,
      brand: p.brands?.split(",")[0]?.trim() || undefined,
      kcal_per_100g: kcal,
      protein_per_100g: p.nutriments?.proteins_100g ?? 0,
      carbs_per_100g: p.nutriments?.carbohydrates_100g ?? 0,
      fat_per_100g: p.nutriments?.fat_100g ?? 0,
      serving_size_g:
        Number.isFinite(serving) && serving > 0 ? serving : undefined,
    };
  }
}
