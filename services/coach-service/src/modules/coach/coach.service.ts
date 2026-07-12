import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "@platform/service-kit";

import { CoachRepository } from "./coach.repository";
import {
  buildDailyContext,
  buildWeeklyContext,
  type CoachFacts,
  type WeeklyFacts,
} from "./coach-facts";
import {
  COACH_LLM_PROVIDER,
  type CoachLlmProvider,
} from "./provider/coach-llm.provider";
import type { AppConfig } from "../../config/configuration";

const SYSTEM_BASE =
  "Tu es le coach NutriBalance : un coach nutrition et sport bienveillant, " +
  "concret et concis. Tu réponds en français, en 2-4 phrases, avec des " +
  "recommandations actionnables basées uniquement sur le contexte fourni. " +
  "Tu n'es pas médecin : pour toute question médicale, recommande un " +
  "professionnel de santé.";

@Injectable()
export class CoachService {
  private readonly ttl: { advice: number; report: number };

  constructor(
    private readonly repo: CoachRepository,
    @Inject(COACH_LLM_PROVIDER) private readonly llm: CoachLlmProvider,
    private readonly redis: RedisService,
    config: ConfigService<AppConfig, true>,
  ) {
    const coach = config.get("coach", { infer: true });
    this.ttl = {
      advice: coach.adviceCacheTtlSec,
      report: coach.reportCacheTtlSec,
    };
  }

  /** É8 — conseil quotidien selon l'écart calories/macros (+ plateau). */
  async dailyAdvice(userId: string, date?: string) {
    const day = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
    const facts = await this.repo.gatherDailyFacts(userId, day);

    const cacheKey = `coach:advice:${userId}:${facts.date}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { advice: cached, provider: this.llm.name, cached: true, facts };
    }

    const advice = await this.llm.generate({
      kind: "daily_advice",
      system: `${SYSTEM_BASE}\n\nCONTEXTE UTILISATEUR :\n${buildDailyContext(facts)}`,
      messages: [
        {
          role: "user",
          content:
            "Donne-moi le conseil du jour en fonction de mon avancement.",
        },
      ],
      facts: this.adviceFacts(facts),
    });
    await this.redis.set(cacheKey, advice, this.ttl.advice);
    return { advice, provider: this.llm.name, cached: false, facts };
  }

  /** É8 — chat coach IA with persisted history as context. */
  async chat(userId: string, message: string) {
    const [facts, history] = await Promise.all([
      this.repo.gatherDailyFacts(userId, new Date()),
      this.repo.history(userId),
    ]);
    await this.repo.appendMessage(userId, "user", message);

    const reply = await this.llm.generate({
      kind: "chat",
      system: `${SYSTEM_BASE}\n\nCONTEXTE UTILISATEUR :\n${buildDailyContext(facts)}`,
      messages: [...history, { role: "user", content: message }],
      facts: this.adviceFacts(facts),
    });
    await this.repo.appendMessage(userId, "assistant", reply);
    return { reply, provider: this.llm.name };
  }

  history(userId: string) {
    return this.repo.historyWithMeta(userId);
  }

  /** É8 — rapport hebdo (résumé + recommandations), cached per week. */
  async weeklyReport(userId: string, weekStart?: string) {
    const start = weekStart
      ? new Date(`${weekStart}T00:00:00.000Z`)
      : this.mostRecentMonday();
    const facts = await this.repo.gatherWeeklyFacts(userId, start);

    const cacheKey = `coach:report:${userId}:${facts.week_start}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { report: cached, provider: this.llm.name, cached: true, facts };
    }

    const report = await this.llm.generate({
      kind: "weekly_report",
      system: `${SYSTEM_BASE}\n\nBILAN DE LA SEMAINE :\n${buildWeeklyContext(facts)}`,
      messages: [
        {
          role: "user",
          content:
            "Rédige mon bilan hebdomadaire : résumé des points clés puis 2 recommandations.",
        },
      ],
      facts: this.reportFacts(facts),
    });
    await this.redis.set(cacheKey, report, this.ttl.report);
    return { report, provider: this.llm.name, cached: false, facts };
  }

  private adviceFacts(facts: CoachFacts): Record<string, unknown> {
    return {
      remaining_kcal: facts.targets
        ? facts.targets.calories_kcal - facts.today.kcal
        : null,
      remaining_protein_g: facts.targets
        ? Math.round(
            Math.max(0, facts.targets.protein_g - facts.today.protein_g),
          )
        : null,
      plateau: facts.plateau.plateau,
    };
  }

  private reportFacts(facts: WeeklyFacts): Record<string, unknown> {
    return {
      avg_kcal: facts.avg_kcal,
      workouts: facts.workouts,
      plateau: facts.plateau.plateau,
    };
  }

  private mostRecentMonday(): Date {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sunday
    const diff = (day + 6) % 7;
    const monday = new Date(now.getTime() - diff * 24 * 3600 * 1000);
    return new Date(`${monday.toISOString().slice(0, 10)}T00:00:00.000Z`);
  }
}
