/**
 * É3 — pure snapshot arithmetic: quantity × per-100g values, rounded once at
 * this boundary (kcal to whole, macros to 0.1 g). Stored on the journal row
 * so a later food edit never rewrites eaten history.
 */

export interface Per100g {
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

export interface EntryNutrition {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function computeEntryNutrition(
  food: Per100g,
  quantityG: number,
): EntryNutrition {
  const factor = quantityG / 100;
  return {
    kcal: Math.round(food.kcal_per_100g * factor),
    protein_g: round1(food.protein_per_100g * factor),
    carbs_g: round1(food.carbs_per_100g * factor),
    fat_g: round1(food.fat_per_100g * factor),
  };
}
