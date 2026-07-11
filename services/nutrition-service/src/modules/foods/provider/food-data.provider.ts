/**
 * Port for external food databases (swappable-providers convention).
 * backlog: D3 — bound in DI from `foodProvider` config: deterministic mock in
 * dev/CI, OpenFoodFacts in production. Implementations degrade gracefully
 * (empty result / null on outage), never throw into the request path.
 */
export interface ProviderFood {
  /** Product barcode — the cache key in food_items.off_barcode. */
  barcode: string;
  name: string;
  brand?: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_size_g?: number;
}

export interface FoodDataProvider {
  searchByName(query: string, limit?: number): Promise<ProviderFood[]>;
  getByBarcode(barcode: string): Promise<ProviderFood | null>;
}

export const FOOD_DATA_PROVIDER = "FOOD_DATA_PROVIDER";
