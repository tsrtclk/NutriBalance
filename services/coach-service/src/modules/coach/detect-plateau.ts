/**
 * É8 — pure plateau detection over the recent weight curve.
 *
 * backlog: D8 — the rule is provisional: a lose/gain goal shows a plateau
 * when the last 21 days hold ≥ 4 measurements spanning ≥ 14 days whose
 * total change is under 0.3% of body weight. Product may want different
 * windows or an EMA-based rule later; tune the named constants here only.
 */

export interface WeightPoint {
  /** ISO date of the measurement. */
  date: string;
  kg: number;
}

export interface PlateauResult {
  plateau: boolean;
  /** Signed % change first→last inside the window (null without enough data). */
  change_pct: number | null;
  span_days: number;
  points: number;
}

const WINDOW_DAYS = 21;
const MIN_SPAN_DAYS = 14;
const MIN_POINTS = 4;
const PLATEAU_THRESHOLD_PCT = 0.3;

const DAY_MS = 24 * 3600 * 1000;

export function detectPlateau(
  entries: WeightPoint[],
  goal: string | null,
  now: Date = new Date(),
): PlateauResult {
  const cutoff = now.getTime() - WINDOW_DAYS * DAY_MS;
  const window = entries
    .filter((e) => new Date(e.date).getTime() >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));

  const empty: PlateauResult = {
    plateau: false,
    change_pct: null,
    span_days: 0,
    points: window.length,
  };
  if (window.length < MIN_POINTS) return empty;

  const first = window[0];
  const last = window[window.length - 1];
  const spanDays = Math.round(
    (new Date(last.date).getTime() - new Date(first.date).getTime()) / DAY_MS,
  );
  const changePct =
    Math.round(((last.kg - first.kg) / first.kg) * 100 * 100) / 100;

  // Maintain/recomp WANT a flat curve — a plateau only matters when the
  // goal expects the scale to move.
  const goalExpectsMovement = goal === "lose" || goal === "gain";

  return {
    plateau:
      goalExpectsMovement &&
      spanDays >= MIN_SPAN_DAYS &&
      Math.abs(changePct) < PLATEAU_THRESHOLD_PCT,
    change_pct: changePct,
    span_days: spanDays,
    points: window.length,
  };
}
