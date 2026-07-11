import { computeEntryNutrition } from "../src/modules/journal/compute-entry-nutrition";

// Reference food: chicken breast per 100g.
const CHICKEN = {
  kcal_per_100g: 165,
  protein_per_100g: 31,
  carbs_per_100g: 0,
  fat_per_100g: 3.6,
};

describe("computeEntryNutrition", () => {
  it("scales linearly with quantity (150 g of chicken)", () => {
    const n = computeEntryNutrition(CHICKEN, 150);
    expect(n.kcal).toBe(248); // 165 × 1.5 = 247.5 → rounded
    expect(n.protein_g).toBe(46.5);
    expect(n.carbs_g).toBe(0);
    expect(n.fat_g).toBe(5.4);
  });

  it("is identity at exactly 100 g", () => {
    const n = computeEntryNutrition(CHICKEN, 100);
    expect(n).toEqual({ kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 });
  });

  it("handles small quantities without float noise (15 g serving)", () => {
    const n = computeEntryNutrition(
      {
        kcal_per_100g: 539,
        protein_per_100g: 6.3,
        carbs_per_100g: 57.5,
        fat_per_100g: 30.9,
      },
      15,
    );
    expect(n.kcal).toBe(81); // 539 × 0.15 = 80.85 → rounded
    expect(n.protein_g).toBe(0.9); // 0.945 → 0.9
    expect(n.carbs_g).toBe(8.6); // 8.625 → 8.6
    expect(n.fat_g).toBe(4.6); // 4.635 → 4.6
  });

  it("rounds macros to 0.1 g and kcal to whole numbers", () => {
    const n = computeEntryNutrition(
      {
        kcal_per_100g: 123.4,
        protein_per_100g: 10.06,
        carbs_per_100g: 20.04,
        fat_per_100g: 5.55,
      },
      100,
    );
    expect(Number.isInteger(n.kcal)).toBe(true);
    expect(n.protein_g).toBe(10.1);
    expect(n.carbs_g).toBe(20);
    expect(n.fat_g).toBe(5.6);
  });
});
