import { Injectable } from "@nestjs/common";

import type { CoachLlmProvider, CoachRequest } from "./coach-llm.provider";

/**
 * Deterministic coach for dev/CI/e2e (backlog: D9) — templated French answers
 * built from the structured facts, so tests can assert stable content with
 * no network and no API key.
 */
@Injectable()
export class MockCoachProvider implements CoachLlmProvider {
  readonly name = "mock" as const;

  async generate(request: CoachRequest): Promise<string> {
    switch (request.kind) {
      case "daily_advice": {
        const remaining = this.num(request.facts, "remaining_kcal");
        const protein = this.num(request.facts, "remaining_protein_g");
        const plateau = request.facts.plateau === true;
        const parts = [
          remaining != null
            ? `Conseil du jour : il vous reste ${remaining} kcal pour atteindre votre cible.`
            : "Conseil du jour : complétez votre profil pour des cibles personnalisées.",
        ];
        if (protein != null && protein > 0) {
          parts.push(`Pensez aux protéines : encore ${protein} g à consommer.`);
        }
        if (plateau) {
          parts.push(
            "Plateau détecté : envisagez d'ajuster vos calories ou votre activité.",
          );
        }
        return parts.join(" ");
      }
      case "weekly_report": {
        const avg = this.num(request.facts, "avg_kcal");
        return (
          `Bilan hebdo : moyenne de ${avg ?? 0} kcal/jour, ` +
          `${this.num(request.facts, "workouts") ?? 0} séance(s). ` +
          "Continuez sur cette lancée et gardez un œil sur vos protéines."
        );
      }
      case "chat": {
        const last = request.messages[request.messages.length - 1];
        return `Coach (démo) : bien reçu — « ${last?.content ?? ""} ». Gardez le cap sur vos objectifs !`;
      }
    }
  }

  private num(facts: Record<string, unknown>, key: string): number | null {
    const v = facts[key];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
}
