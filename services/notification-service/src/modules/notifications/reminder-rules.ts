/**
 * É9 — pure reminder rules: what fires at a given minute, and when a weight
 * goal counts as reached. No I/O; the scheduler and the bus consumer feed
 * these with already-fetched rows.
 *
 * backlog: D7 — all "HH:MM" times are interpreted in UTC until per-user
 * timezones land. The waking window and default copy are provisional too.
 */

// Reminders only fire inside the waking window (UTC minutes since midnight).
export const WAKE_START_MIN = 8 * 60; // 08:00
export const WAKE_END_MIN = 22 * 60; // 22:00

export type NotificationType =
  | "meal_reminder"
  | "hydration_reminder"
  | "supplement_reminder"
  | "workout_reminder"
  | "goal_reached";

export interface ReminderMessage {
  type: NotificationType;
  title: string;
  body: string;
  /** Idempotency key per user — one firing per slot per day. */
  dedupe_key: string;
}

/** True when a recurring every-N-minutes reminder lands on this minute. */
export function hydrationDue(
  minutesSinceMidnight: number,
  everyMin: number,
): boolean {
  if (everyMin <= 0) return false;
  if (
    minutesSinceMidnight < WAKE_START_MIN ||
    minutesSinceMidnight > WAKE_END_MIN
  ) {
    return false;
  }
  return (minutesSinceMidnight - WAKE_START_MIN) % everyMin === 0;
}

export function mealReminder(dateIso: string, hhmm: string): ReminderMessage {
  return {
    type: "meal_reminder",
    title: "C'est l'heure de manger 🍽️",
    body: "Pensez à enregistrer votre repas dans le journal.",
    dedupe_key: `meal:${dateIso}:${hhmm}`,
  };
}

export function hydrationReminder(
  dateIso: string,
  hhmm: string,
): ReminderMessage {
  return {
    type: "hydration_reminder",
    title: "Un verre d'eau ? 💧",
    body: "Restez hydraté — ajoutez votre consommation en un geste.",
    dedupe_key: `hydration:${dateIso}:${hhmm}`,
  };
}

export function supplementReminder(
  dateIso: string,
  hhmm: string,
  supplementName: string,
  supplementId: string,
): ReminderMessage {
  return {
    type: "supplement_reminder",
    title: `Complément : ${supplementName} 💊`,
    body: `C'est l'heure de prendre ${supplementName}.`,
    dedupe_key: `supplement:${supplementId}:${dateIso}:${hhmm}`,
  };
}

export function workoutReminder(
  dateIso: string,
  hhmm: string,
): ReminderMessage {
  return {
    type: "workout_reminder",
    title: "Séance du jour 🏋️",
    body: "Votre séance vous attend — consultez la suggestion du jour.",
    dedupe_key: `workout:${dateIso}:${hhmm}`,
  };
}

/**
 * É9 "alerte objectif atteint": a lose goal is reached at or below the
 * target, a gain goal at or above. Maintain/recomp have no scale target.
 */
export function isGoalReached(
  goal: string,
  targetWeightKg: number | null,
  weightKg: number,
): boolean {
  if (targetWeightKg == null) return false;
  if (goal === "lose") return weightKg <= targetWeightKg;
  if (goal === "gain") return weightKg >= targetWeightKg;
  return false;
}

export function goalReachedMessage(targetWeightKg: number): ReminderMessage {
  return {
    type: "goal_reached",
    title: "Objectif atteint 🎉",
    body: `Félicitations — vous avez atteint votre poids cible de ${targetWeightKg} kg !`,
    dedupe_key: `goal:${targetWeightKg}`,
  };
}
