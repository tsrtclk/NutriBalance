import {
  computeBmr,
  computeTargets,
  type TargetInputs,
} from "@platform/domain";

// Reference subject: male, 30y, 180cm, 80kg, moderate activity.
// Mifflin-St Jeor: 10*80 + 6.25*180 - 5*30 + 5 = 1780 kcal.
const BASE: TargetInputs = {
  sex: "male",
  ageYears: 30,
  heightCm: 180,
  weightKg: 80,
  activityLevel: "moderate",
  goal: "maintain",
};

describe("computeBmr (Mifflin-St Jeor)", () => {
  it("matches the textbook value for a male subject", () => {
    expect(computeBmr("male", 80, 180, 30)).toBe(1780);
  });

  it("applies the female offset (-161 vs +5)", () => {
    expect(computeBmr("female", 80, 180, 30)).toBe(1780 - 166);
  });
});

describe("computeTargets", () => {
  it("maintain: calories = TDEE = BMR × activity factor", () => {
    const t = computeTargets(BASE);
    expect(t.bmr_kcal).toBe(1780);
    expect(t.tdee_kcal).toBe(Math.round(1780 * 1.55));
    expect(t.calories_kcal).toBe(t.tdee_kcal);
    expect(t.weekly_rate_kg).toBe(0);
    expect(t.weekly_rate_capped).toBe(false);
  });

  it("activity factors are monotonic", () => {
    const levels = [
      "sedentary",
      "light",
      "moderate",
      "active",
      "very_active",
    ] as const;
    const tdees = levels.map(
      (activityLevel) => computeTargets({ ...BASE, activityLevel }).tdee_kcal,
    );
    for (let i = 1; i < tdees.length; i++)
      expect(tdees[i]).toBeGreaterThan(tdees[i - 1]);
  });

  it("lose without a target uses the default pace (-0.75% BW/week)", () => {
    const t = computeTargets({ ...BASE, goal: "lose" });
    expect(t.weekly_rate_kg).toBeCloseTo(-0.6, 2); // 0.75% of 80kg
    expect(t.calories_kcal).toBeLessThan(t.tdee_kcal);
    expect(t.breakdown.goal_delta_kcal_per_day).toBeCloseTo(
      (-0.6 * 7700) / 7,
      0,
    );
  });

  it("clamps an unrealistic loss wish to 1% BW/week and flags it", () => {
    // 10kg in 4 weeks = 2.5kg/wk — way past the 0.8kg/wk cap for 80kg.
    const t = computeTargets({
      ...BASE,
      goal: "lose",
      targetWeightKg: 70,
      weeksToTarget: 4,
    });
    expect(t.weekly_rate_kg).toBeCloseTo(-0.8, 2);
    expect(t.weekly_rate_capped).toBe(true);
  });

  it("keeps a realistic loss wish un-clamped", () => {
    // 2kg in 5 weeks = 0.4kg/wk, inside the band.
    const t = computeTargets({
      ...BASE,
      goal: "lose",
      targetWeightKg: 78,
      weeksToTarget: 5,
    });
    expect(t.weekly_rate_kg).toBeCloseTo(-0.4, 2);
    expect(t.weekly_rate_capped).toBe(false);
  });

  it("ignores a target on the wrong side of the goal", () => {
    // Goal is lose but the target is heavier — fall back to the default pace.
    const t = computeTargets({
      ...BASE,
      goal: "lose",
      targetWeightKg: 90,
      weeksToTarget: 10,
    });
    expect(t.weekly_rate_kg).toBeCloseTo(-0.6, 2);
    expect(t.weekly_rate_capped).toBe(false);
  });

  it("gain runs a surplus, clamped to 0.5% BW/week", () => {
    const t = computeTargets({
      ...BASE,
      goal: "gain",
      targetWeightKg: 90,
      weeksToTarget: 2,
    });
    expect(t.weekly_rate_kg).toBeCloseTo(0.4, 2); // 0.5% of 80kg
    expect(t.weekly_rate_capped).toBe(true);
    expect(t.calories_kcal).toBeGreaterThan(t.tdee_kcal);
  });

  it("recomp: mild deficit (10% under TDEE), zero expected scale movement", () => {
    const t = computeTargets({ ...BASE, goal: "recomp" });
    expect(t.calories_kcal).toBe(Math.round(t.tdee_kcal * 0.9));
    expect(t.weekly_rate_kg).toBe(0);
    expect(t.breakdown.protein_g_per_kg).toBe(2.2);
  });

  it("macros add back up to the calorie target (±rounding)", () => {
    const t = computeTargets({ ...BASE, goal: "lose" });
    const kcalFromMacros = t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9;
    expect(Math.abs(kcalFromMacros - t.calories_kcal)).toBeLessThanOrEqual(15);
  });

  it("never prescribes below the 1200 kcal floor", () => {
    const t = computeTargets({
      sex: "female",
      ageYears: 60,
      heightCm: 150,
      weightKg: 45,
      activityLevel: "sedentary",
      goal: "lose",
      targetWeightKg: 40,
      weeksToTarget: 6,
    });
    expect(t.calories_kcal).toBe(1200);
    expect(t.breakdown.calorie_floor_applied).toBe(true);
  });

  it("water target scales with weight and activity", () => {
    const sedentary = computeTargets({ ...BASE, activityLevel: "sedentary" });
    const active = computeTargets({ ...BASE, activityLevel: "very_active" });
    expect(sedentary.water_ml).toBe(2800); // 35ml × 80kg
    expect(active.water_ml).toBe(3800); // + 1000ml bump
  });
});
