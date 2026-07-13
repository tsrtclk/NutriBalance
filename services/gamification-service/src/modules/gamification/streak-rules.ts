/**
 * É10 — streak arithmetic (backlog: D10). Pure functions: the consumer feeds
 * them already-fetched state. A "day" is a UTC calendar day ("YYYY-MM-DD"),
 * matching the D7 convention (no per-user timezone yet); lexicographic
 * comparison of day strings is therefore chronological.
 */

export const STREAK_KINDS = [
  "journal",
  "workout",
  "hydration",
  "supplement",
] as const;
export type StreakKind = (typeof STREAK_KINDS)[number];

export interface StreakState {
  current_len: number;
  best_len: number;
  /** Last day that advanced the chain, "YYYY-MM-DD"; null = never. */
  last_day: string | null;
  events_total: number;
}

export const EMPTY_STREAK: StreakState = {
  current_len: 0,
  best_len: 0,
  last_day: null,
  events_total: 0,
};

/** UTC calendar day of an ISO timestamp (or date-only string). */
export function utcDayOf(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Feed one activity day into the chain:
 *   same day        → counts the event, chain unchanged
 *   last_day + 1    → chain grows
 *   older than last → backfill; never rewinds the chain
 *   gap (or first)  → chain restarts at 1
 */
export function advanceStreak(prev: StreakState, day: string): StreakState {
  const events_total = prev.events_total + 1;
  if (prev.last_day !== null && day <= prev.last_day) {
    return { ...prev, events_total };
  }
  const current_len =
    prev.last_day !== null && day === nextDay(prev.last_day)
      ? prev.current_len + 1
      : 1;
  return {
    current_len,
    best_len: Math.max(prev.best_len, current_len),
    last_day: day,
    events_total,
  };
}

/**
 * What the chain is worth when *read* on `today`: still alive if the last
 * activity was today or yesterday (yesterday keeps it rescuable until
 * midnight), otherwise it reads 0 — the stored row resets on the next event.
 */
export function effectiveCurrent(state: StreakState, today: string): number {
  if (state.last_day === null) return 0;
  if (state.last_day === today || nextDay(state.last_day) === today) {
    return state.current_len;
  }
  return 0;
}
