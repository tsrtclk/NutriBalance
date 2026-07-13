/**
 * É10 — badge catalogue + award rule (backlog: D11). The catalogue is
 * code-side: badge_awards only stores (user, code, when), so retitling a
 * badge never migrates data. Awards are monotonic — a broken streak keeps
 * its badges.
 */
import type { StreakKind, StreakState } from "./streak-rules";

/** backlog: D11 — provisional milestone ladder, same for every kind. */
export const STREAK_MILESTONES = [3, 7, 30] as const;

const KIND_LABELS: Record<StreakKind, string> = {
  journal: "journal alimentaire",
  workout: "entraînement",
  hydration: "hydratation",
  supplement: "compléments",
};

const FIRST_TITLES: Record<StreakKind, string> = {
  journal: "Premier repas consigné",
  workout: "Première séance terminée",
  hydration: "Premier verre consigné",
  supplement: "Première prise consignée",
};

export interface BadgeDef {
  code: string;
  title: string;
}

export const BADGE_CATALOGUE: readonly BadgeDef[] = (
  Object.keys(KIND_LABELS) as StreakKind[]
).flatMap((kind) => [
  { code: `first_${kind}`, title: FIRST_TITLES[kind] },
  ...STREAK_MILESTONES.map((n) => ({
    code: `${kind}_streak_${n}`,
    title: `Série de ${n} jours — ${KIND_LABELS[kind]}`,
  })),
]);

export function badgeTitle(code: string): string {
  return BADGE_CATALOGUE.find((b) => b.code === code)?.title ?? code;
}

/**
 * Badges unlocked by the state a streak just reached, minus those already
 * held. Deterministic and idempotent: replaying an event awards nothing new.
 */
export function newlyEarnedBadges(
  kind: StreakKind,
  state: StreakState,
  already: ReadonlySet<string>,
): string[] {
  const earned: string[] = [];
  if (state.events_total >= 1) earned.push(`first_${kind}`);
  for (const n of STREAK_MILESTONES) {
    if (state.current_len >= n) earned.push(`${kind}_streak_${n}`);
  }
  return earned.filter((code) => !already.has(code));
}
