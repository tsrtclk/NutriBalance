/**
 * É1 — pure daily-target derivation (see the domain-scoring skill: no I/O, the
 * service feeds it already-fetched profile fields and it returns the numbers
 * plus a breakdown the UI can explain).
 *
 * backlog: D1 — every constant below is provisional until product signs off
 * (rates, macro split, calorie floor, water bonuses). Keep them named and
 * tune here only.
 */

export type Sex = "male" | "female";
export type ActivityLevel =
  "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain" | "recomp";

export interface TargetInputs {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  /** Optional pacing wish: where the user wants to land… */
  targetWeightKg?: number;
  /** …and in how many weeks (derived from target_date by the caller). */
  weeksToTarget?: number;
}

export interface Targets {
  bmr_kcal: number;
  tdee_kcal: number;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  water_ml: number;
  /** Signed kg per week; negative = loss. */
  weekly_rate_kg: number;
  /** True when the requested pace was clamped to the realistic band. */
  weekly_rate_capped: boolean;
  breakdown: {
    activity_factor: number;
    goal_delta_kcal_per_day: number;
    protein_g_per_kg: number;
    fat_share_of_calories: number;
    calorie_floor_applied: boolean;
  };
}

// Mifflin-St Jeor sex offsets (kcal).
const MSJ_MALE_OFFSET = 5;
const MSJ_FEMALE_OFFSET = -161;

// Standard TDEE multipliers per self-reported activity level.
const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Realistic weekly pace as % of body weight (product backlog: ~0.5-1%/week
// for loss). Gains are slower — beyond ~0.5%/wk is mostly fat.
const MAX_LOSS_RATE_PCT_BW = 1.0;
const MAX_GAIN_RATE_PCT_BW = 0.5;
// Defaults when no target weight/date is set.
const DEFAULT_LOSS_RATE_PCT_BW = 0.75;
const DEFAULT_GAIN_RATE_PCT_BW = 0.25;

// ~7700 kcal per kg of body-weight change.
const KCAL_PER_KG = 7700;

// Recomposition: mild deficit at high protein, scale weight ~steady.
const RECOMP_CALORIE_FACTOR = 0.9;

// Protein g per kg of body weight per goal.
const PROTEIN_G_PER_KG: Record<Goal, number> = {
  lose: 2.0,
  maintain: 1.6,
  gain: 1.8,
  recomp: 2.2,
};

// Fat gets a fixed share of calories; carbs take the remainder.
const FAT_SHARE_OF_CALORIES = 0.25;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

// Hard floor — below this the plan is not a diet, it's a red flag.
const MIN_CALORIES_KCAL = 1200;

// É4 seed: water = base ml/kg + an activity bump.
const WATER_ML_PER_KG = 35;
const WATER_ACTIVITY_BONUS_ML: Record<ActivityLevel, number> = {
  sedentary: 0,
  light: 250,
  moderate: 500,
  active: 750,
  very_active: 1000,
};

/** Mifflin-St Jeor BMR (kcal/day). */
export function computeBmr(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  ageYears: number,
): number {
  const offset = sex === "male" ? MSJ_MALE_OFFSET : MSJ_FEMALE_OFFSET;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + offset;
}

/**
 * Weekly rate in kg (signed): the user's wish clamped to the realistic band,
 * or the goal's default pace when no wish is set. Direction always follows
 * the goal, not the wish — a "lose" goal never yields a surplus.
 */
function resolveWeeklyRate(inputs: TargetInputs): {
  rateKg: number;
  capped: boolean;
} {
  const { goal, weightKg, targetWeightKg, weeksToTarget } = inputs;
  if (goal === "maintain" || goal === "recomp")
    return { rateKg: 0, capped: false };

  const sign = goal === "lose" ? -1 : 1;
  const maxPct = goal === "lose" ? MAX_LOSS_RATE_PCT_BW : MAX_GAIN_RATE_PCT_BW;
  const maxKg = (maxPct / 100) * weightKg;

  if (
    targetWeightKg == null ||
    weeksToTarget == null ||
    weeksToTarget <= 0 ||
    // A target on the wrong side of the goal is ignored, not obeyed.
    Math.sign(targetWeightKg - weightKg) !== sign
  ) {
    const defaultPct =
      goal === "lose" ? DEFAULT_LOSS_RATE_PCT_BW : DEFAULT_GAIN_RATE_PCT_BW;
    return { rateKg: sign * (defaultPct / 100) * weightKg, capped: false };
  }

  const wishedKg = Math.abs(targetWeightKg - weightKg) / weeksToTarget;
  if (wishedKg > maxKg) return { rateKg: sign * maxKg, capped: true };
  return { rateKg: sign * wishedKg, capped: false };
}

/** Daily calorie + macro + water targets from a profile snapshot. */
export function computeTargets(inputs: TargetInputs): Targets {
  const bmr = computeBmr(
    inputs.sex,
    inputs.weightKg,
    inputs.heightCm,
    inputs.ageYears,
  );
  const activityFactor = ACTIVITY_FACTORS[inputs.activityLevel];
  const tdee = bmr * activityFactor;

  const { rateKg, capped } = resolveWeeklyRate(inputs);
  let deltaPerDay = (rateKg * KCAL_PER_KG) / 7;
  if (inputs.goal === "recomp") {
    deltaPerDay = -(1 - RECOMP_CALORIE_FACTOR) * tdee;
  }

  const rawCalories = tdee + deltaPerDay;
  const floorApplied = rawCalories < MIN_CALORIES_KCAL;
  const calories = floorApplied ? MIN_CALORIES_KCAL : rawCalories;

  const proteinPerKg = PROTEIN_G_PER_KG[inputs.goal];
  const proteinG = proteinPerKg * inputs.weightKg;
  const fatG = (calories * FAT_SHARE_OF_CALORIES) / KCAL_PER_G_FAT;
  const carbsG = Math.max(
    0,
    (calories - proteinG * KCAL_PER_G_PROTEIN - fatG * KCAL_PER_G_FAT) /
      KCAL_PER_G_CARB,
  );

  const waterMl =
    WATER_ML_PER_KG * inputs.weightKg +
    WATER_ACTIVITY_BONUS_ML[inputs.activityLevel];

  return {
    bmr_kcal: Math.round(bmr),
    tdee_kcal: Math.round(tdee),
    calories_kcal: Math.round(calories),
    protein_g: Math.round(proteinG),
    fat_g: Math.round(fatG),
    carbs_g: Math.round(carbsG),
    water_ml: Math.round(waterMl / 50) * 50,
    weekly_rate_kg: Math.round(rateKg * 100) / 100,
    weekly_rate_capped: capped,
    breakdown: {
      activity_factor: activityFactor,
      goal_delta_kcal_per_day: Math.round(deltaPerDay),
      protein_g_per_kg: proteinPerKg,
      fat_share_of_calories: FAT_SHARE_OF_CALORIES,
      calorie_floor_applied: floorApplied,
    },
  };
}
