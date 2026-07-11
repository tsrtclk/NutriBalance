import { Injectable } from "@nestjs/common";

import type { FoodDataProvider, ProviderFood } from "./food-data.provider";

/**
 * Deterministic provider for dev/CI/e2e (backlog: D3) — a tiny seed catalogue
 * so search/barcode flows work with no network and stable numbers.
 */
@Injectable()
export class MockFoodProvider implements FoodDataProvider {
  private readonly catalogue: ProviderFood[] = [
    {
      barcode: "3017620422003",
      name: "Pâte à tartiner aux noisettes",
      brand: "MockFacts",
      kcal_per_100g: 539,
      protein_per_100g: 6.3,
      carbs_per_100g: 57.5,
      fat_per_100g: 30.9,
      serving_size_g: 15,
    },
    {
      barcode: "3560070462414",
      name: "Poulet rôti (blanc)",
      brand: "MockFacts",
      kcal_per_100g: 165,
      protein_per_100g: 31,
      carbs_per_100g: 0,
      fat_per_100g: 3.6,
    },
    {
      barcode: "3038350208808",
      name: "Riz basmati cuit",
      brand: "MockFacts",
      kcal_per_100g: 130,
      protein_per_100g: 2.7,
      carbs_per_100g: 28.2,
      fat_per_100g: 0.3,
    },
    {
      barcode: "3276550323198",
      name: "Yaourt grec nature",
      brand: "MockFacts",
      kcal_per_100g: 97,
      protein_per_100g: 9,
      carbs_per_100g: 3.9,
      fat_per_100g: 5,
      serving_size_g: 125,
    },
    {
      barcode: "3560071097892",
      name: "Flocons d'avoine",
      brand: "MockFacts",
      kcal_per_100g: 379,
      protein_per_100g: 13.5,
      carbs_per_100g: 67.7,
      fat_per_100g: 6.5,
      serving_size_g: 40,
    },
  ];

  async searchByName(query: string, limit = 10): Promise<ProviderFood[]> {
    const q = query.toLowerCase();
    return this.catalogue
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.brand ?? "").toLowerCase().includes(q),
      )
      .slice(0, limit);
  }

  async getByBarcode(barcode: string): Promise<ProviderFood | null> {
    return this.catalogue.find((f) => f.barcode === barcode) ?? null;
  }
}
