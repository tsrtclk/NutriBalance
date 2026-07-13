/**
 * É10 — défis hebdo (backlog: D12). The week's challenge is a pure function
 * of the ISO week (rotating catalogue), so every user sees the same défi and
 * nothing needs scheduling; only the per-user counter is stored.
 */
import type { StreakKind } from "./streak-rules";

export interface ChallengeDef {
  code: string;
  title: string;
  kind: StreakKind;
  /** "days" = one increment per distinct UTC day; "count" = every event. */
  metric: "days" | "count";
  target: number;
}

/** backlog: D12 — provisional catalogue; rotation order is the array order. */
export const CHALLENGE_CATALOGUE: readonly ChallengeDef[] = [
  {
    code: "journal_days_5",
    title: "Consignez vos repas 5 jours cette semaine",
    kind: "journal",
    metric: "days",
    target: 5,
  },
  {
    code: "workouts_3",
    title: "Terminez 3 séances cette semaine",
    kind: "workout",
    metric: "count",
    target: 3,
  },
  {
    code: "hydration_days_5",
    title: "Hydratez-vous 5 jours cette semaine",
    kind: "hydration",
    metric: "days",
    target: 5,
  },
  {
    code: "supplement_days_5",
    title: "Prenez vos compléments 5 jours cette semaine",
    kind: "supplement",
    metric: "days",
    target: 5,
  },
];

/** Monday of the ISO week containing `day` ("YYYY-MM-DD", UTC). */
export function mondayOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** 1970-01-05 was a Monday — week 0 of the rotation. */
const EPOCH_MONDAY_MS = Date.UTC(1970, 0, 5);
const WEEK_MS = 7 * 24 * 3600 * 1000;

export function challengeForWeek(weekStart: string): ChallengeDef {
  const weeks = Math.round(
    (Date.UTC(
      Number(weekStart.slice(0, 4)),
      Number(weekStart.slice(5, 7)) - 1,
      Number(weekStart.slice(8, 10)),
    ) -
      EPOCH_MONDAY_MS) /
      WEEK_MS,
  );
  return CHALLENGE_CATALOGUE[weeks % CHALLENGE_CATALOGUE.length];
}

export function challengeByCode(code: string): ChallengeDef | undefined {
  return CHALLENGE_CATALOGUE.find((c) => c.code === code);
}

export interface ChallengeAdvance {
  progress: number;
  last_day: string | null;
  /** True only on the event that crosses the target line. */
  justCompleted: boolean;
}

export function advanceChallenge(
  def: ChallengeDef,
  prev: { progress: number; last_day: string | null },
  kind: StreakKind,
  day: string,
): ChallengeAdvance {
  if (kind !== def.kind) {
    return { ...prev, justCompleted: false };
  }
  if (def.metric === "days" && prev.last_day === day) {
    return { ...prev, justCompleted: false };
  }
  const progress = prev.progress + 1;
  return {
    progress,
    last_day: def.metric === "days" ? day : prev.last_day,
    justCompleted: prev.progress < def.target && progress >= def.target,
  };
}
