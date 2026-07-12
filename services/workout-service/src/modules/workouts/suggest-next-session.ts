/**
 * É6 — pure next-session suggestion: rotate the split and steer away from
 * muscle groups trained too recently (surcharge progressive without
 * surentraînement).
 *
 * backlog: D5 — the 48h recovery window, the PPL rotation and the
 * beginner→full-body rule are provisional coaching heuristics until product
 * (or the É8 AI coach) replaces them.
 */

export type SplitDay =
  "push" | "pull" | "legs" | "upper" | "lower" | "full_body";

export interface RecentWorkout {
  /** Completion time (or start, for an unfinished session). */
  at: Date;
  splitDay: string | null;
  muscleGroups: string[];
}

export interface SessionSuggestion {
  suggested_focus: SplitDay;
  /** Trained within the recovery window — steer clear today. */
  avoid_muscle_groups: string[];
  reason: string;
}

const RECOVERY_HOURS = 48;
const PPL_ROTATION: SplitDay[] = ["push", "pull", "legs"];
const UPPER_LOWER_ROTATION: SplitDay[] = ["upper", "lower"];

function nextInRotation(rotation: SplitDay[], last: string): SplitDay {
  const idx = rotation.indexOf(last as SplitDay);
  return rotation[(idx + 1) % rotation.length];
}

export function suggestNextSession(
  recent: RecentWorkout[],
  trainingLevel: string | null | undefined,
  now: Date = new Date(),
): SessionSuggestion {
  const cutoff = now.getTime() - RECOVERY_HOURS * 3600 * 1000;
  const avoid = [
    ...new Set(
      recent
        .filter((w) => w.at.getTime() >= cutoff)
        .flatMap((w) => w.muscleGroups),
    ),
  ].sort();

  // Beginners: full-body sessions until the app knows more (D5).
  if (trainingLevel === "beginner" || recent.length === 0) {
    return {
      suggested_focus: "full_body",
      avoid_muscle_groups: avoid,
      reason:
        recent.length === 0
          ? "Première séance — un full body pour prendre le rythme."
          : "Niveau débutant — le full body reste le plus efficace.",
    };
  }

  const last = [...recent].sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  const lastSplit = last.splitDay ?? "";

  if (UPPER_LOWER_ROTATION.includes(lastSplit as SplitDay)) {
    const next = nextInRotation(UPPER_LOWER_ROTATION, lastSplit);
    return {
      suggested_focus: next,
      avoid_muscle_groups: avoid,
      reason: `Rotation haut/bas — dernière séance « ${lastSplit} ».`,
    };
  }

  if (PPL_ROTATION.includes(lastSplit as SplitDay)) {
    const next = nextInRotation(PPL_ROTATION, lastSplit);
    return {
      suggested_focus: next,
      avoid_muscle_groups: avoid,
      reason: `Rotation push/pull/legs — dernière séance « ${lastSplit} ».`,
    };
  }

  // No labelled split to rotate from — start the PPL cycle.
  return {
    suggested_focus: "push",
    avoid_muscle_groups: avoid,
    reason: "Pas de split identifié — départ du cycle push/pull/legs.",
  };
}
