/**
 * É6 — pure MET-based estimate of calories burned in a session.
 *
 * backlog: D4 — the MET bands per RPE and the standard formula
 * (kcal/min = MET × 3.5 × weightKg / 200) are provisional until product
 * signs off. Named constants; tune here only.
 */

// Strength training METs by perceived intensity (RPE 1-10).
const MET_LIGHT = 3.5; // RPE ≤ 4
const MET_MODERATE = 5.0; // RPE 5-7 (also the no-RPE default)
const MET_VIGOROUS = 6.0; // RPE ≥ 8
const RPE_LIGHT_MAX = 4;
const RPE_VIGOROUS_MIN = 8;

// A session outside this window is a data-entry glitch, not a workout.
const MIN_MINUTES = 1;
const MAX_MINUTES = 300;

export function metForRpe(rpe: number | null | undefined): number {
  if (rpe == null) return MET_MODERATE;
  if (rpe <= RPE_LIGHT_MAX) return MET_LIGHT;
  if (rpe >= RPE_VIGOROUS_MIN) return MET_VIGOROUS;
  return MET_MODERATE;
}

export function computeWorkoutCalories(
  weightKg: number,
  durationMinutes: number,
  rpe?: number | null,
): number {
  const minutes = Math.min(Math.max(durationMinutes, MIN_MINUTES), MAX_MINUTES);
  const met = metForRpe(rpe);
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}
