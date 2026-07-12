/**
 * É8 — the structured facts the repository gathers and every provider
 * (mock or Claude) receives, plus the pure prompt-context builders.
 * Keeping prompt assembly pure makes it unit-testable and keeps the
 * providers dumb.
 */

import type { PlateauResult } from "./detect-plateau";

export interface DayTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

export interface CoachFacts {
  date: string;
  goal: string | null;
  targets: {
    calories_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  } | null;
  today: DayTotals;
  weight_kg: number | null;
  plateau: PlateauResult;
  workouts_7d: number;
}

export interface WeeklyFacts {
  week_start: string;
  week_end: string;
  days_logged: number;
  avg_kcal: number;
  avg_protein_g: number;
  target_kcal: number | null;
  target_protein_g: number | null;
  workouts: number;
  total_volume_kg: number;
  avg_water_ml: number;
  weight_delta_kg: number | null;
  plateau: PlateauResult;
  goal: string | null;
}

const GOAL_FR: Record<string, string> = {
  lose: "perte de poids",
  maintain: "maintien",
  gain: "prise de masse",
  recomp: "recomposition",
};

export function goalLabel(goal: string | null): string {
  return goal ? (GOAL_FR[goal] ?? goal) : "non défini";
}

/** French context block for the daily-advice prompt. */
export function buildDailyContext(facts: CoachFacts): string {
  const lines = [`Date : ${facts.date}`, `Objectif : ${goalLabel(facts.goal)}`];
  if (facts.targets) {
    lines.push(
      `Cibles du jour : ${facts.targets.calories_kcal} kcal · ` +
        `${facts.targets.protein_g} g protéines · ${facts.targets.water_ml} ml d'eau`,
    );
    lines.push(
      `Consommé aujourd'hui : ${facts.today.kcal} kcal · ` +
        `${facts.today.protein_g} g protéines · ${facts.today.water_ml} ml d'eau`,
    );
    lines.push(
      `Reste : ${facts.targets.calories_kcal - facts.today.kcal} kcal · ` +
        `${Math.max(0, facts.targets.protein_g - facts.today.protein_g)} g protéines`,
    );
  } else {
    lines.push("Profil non renseigné — pas de cibles calculées.");
  }
  if (facts.weight_kg != null)
    lines.push(`Poids actuel : ${facts.weight_kg} kg`);
  if (facts.plateau.plateau) {
    lines.push(
      `⚠ Plateau détecté : ${facts.plateau.change_pct}% sur ${facts.plateau.span_days} jours.`,
    );
  }
  lines.push(`Séances (7 derniers jours) : ${facts.workouts_7d}`);
  return lines.join("\n");
}

/** French context block for the weekly-report prompt. */
export function buildWeeklyContext(facts: WeeklyFacts): string {
  const lines = [
    `Semaine du ${facts.week_start} au ${facts.week_end}`,
    `Objectif : ${goalLabel(facts.goal)}`,
    `Jours avec journal : ${facts.days_logged}/7`,
    `Moyenne : ${facts.avg_kcal} kcal/j · ${facts.avg_protein_g} g protéines/j` +
      (facts.target_kcal != null ? ` (cible ${facts.target_kcal} kcal)` : ""),
    `Séances : ${facts.workouts}, volume total ${facts.total_volume_kg} kg`,
    `Hydratation : ${facts.avg_water_ml} ml/j en moyenne`,
  ];
  if (facts.weight_delta_kg != null) {
    lines.push(
      `Poids : ${facts.weight_delta_kg > 0 ? "+" : ""}${facts.weight_delta_kg} kg sur la semaine`,
    );
  }
  if (facts.plateau.plateau) {
    lines.push(
      `⚠ Plateau : ${facts.plateau.change_pct}% sur ${facts.plateau.span_days} jours.`,
    );
  }
  return lines.join("\n");
}
