import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import {
  computeTargets,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "@platform/domain";

import { detectPlateau } from "./detect-plateau";
import type { CoachFacts, DayTotals, WeeklyFacts } from "./coach-facts";
import type { CoachChatTurn } from "./provider/coach-llm.provider";

const DAY_MS = 24 * 3600 * 1000;
const MS_PER_WEEK = 7 * DAY_MS;

/**
 * É8 — the coach's data gatherer. backlog: X3 — this service reads tables
 * owned by profile/nutrition/workout services directly on the shared DB;
 * the derived targets come from the shared pure @platform/domain package
 * so the formula never forks.
 */
@Injectable()
export class CoachRepository {
  constructor(private readonly prisma: PrismaService) {}

  async gatherDailyFacts(userId: string, day: Date): Promise<CoachFacts> {
    const dayStart = new Date(
      `${day.toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

    const [profile, journal, hydration, weights, workouts7d] =
      await Promise.all([
        this.prisma.profile.findUnique({ where: { user_id: userId } }),
        this.journalTotals(userId, dayStart, dayEnd),
        this.hydrationTotal(userId, dayStart, dayEnd),
        this.recentWeights(userId, day),
        this.prisma.workout.count({
          where: {
            user_id: userId,
            started_at: { gte: new Date(day.getTime() - 7 * DAY_MS) },
          },
        }),
      ]);

    const targets = profile ? this.targetsFromProfile(profile, day) : null;

    return {
      date: dayStart.toISOString().slice(0, 10),
      goal: profile?.goal ?? null,
      targets,
      today: { ...journal, water_ml: hydration },
      weight_kg: profile ? Number(profile.weight_kg) : null,
      plateau: detectPlateau(weights, profile?.goal ?? null, day),
      workouts_7d: workouts7d,
    };
  }

  async gatherWeeklyFacts(
    userId: string,
    weekStart: Date,
  ): Promise<WeeklyFacts> {
    const start = new Date(
      `${weekStart.toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    const end = new Date(start.getTime() + 7 * DAY_MS);

    const [profile, journalDays, hydrationRows, workouts, weights] =
      await Promise.all([
        this.prisma.profile.findUnique({ where: { user_id: userId } }),
        this.prisma.journalEntry.groupBy({
          by: ["eaten_on"],
          where: { user_id: userId, eaten_on: { gte: start, lt: end } },
          _sum: { kcal: true, protein_g: true },
        }),
        this.prisma.hydrationEntry.findMany({
          where: { user_id: userId, drunk_at: { gte: start, lt: end } },
          select: { amount_ml: true },
        }),
        this.prisma.workout.findMany({
          where: { user_id: userId, started_at: { gte: start, lt: end } },
          include: { sets: { select: { reps: true, weight_kg: true } } },
        }),
        this.recentWeights(userId, end),
      ]);

    const daysLogged = journalDays.length;
    const totalKcal = journalDays.reduce(
      (sum, d) => sum + Number(d._sum.kcal ?? 0),
      0,
    );
    const totalProtein = journalDays.reduce(
      (sum, d) => sum + Number(d._sum.protein_g ?? 0),
      0,
    );
    const totalVolume = workouts.reduce(
      (sum, w) =>
        sum + w.sets.reduce((s, x) => s + Number(x.weight_kg) * x.reps, 0),
      0,
    );
    const totalWater = hydrationRows.reduce((s, h) => s + h.amount_ml, 0);

    const weekWeights = weights.filter((w) => {
      const t = new Date(w.date).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    const weightDelta =
      weekWeights.length >= 2
        ? Math.round(
            (weekWeights[weekWeights.length - 1].kg - weekWeights[0].kg) * 10,
          ) / 10
        : null;

    const targets = profile ? this.targetsFromProfile(profile, end) : null;

    return {
      week_start: start.toISOString().slice(0, 10),
      week_end: new Date(end.getTime() - DAY_MS).toISOString().slice(0, 10),
      days_logged: daysLogged,
      avg_kcal: daysLogged ? Math.round(totalKcal / daysLogged) : 0,
      avg_protein_g: daysLogged
        ? Math.round((totalProtein / daysLogged) * 10) / 10
        : 0,
      target_kcal: targets?.calories_kcal ?? null,
      target_protein_g: targets?.protein_g ?? null,
      workouts: workouts.length,
      total_volume_kg: Math.round(totalVolume),
      avg_water_ml: Math.round(totalWater / 7),
      weight_delta_kg: weightDelta,
      plateau: detectPlateau(weights, profile?.goal ?? null, end),
      goal: profile?.goal ?? null,
    };
  }

  // --- chat history ---------------------------------------------------------

  async appendMessage(
    userId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<void> {
    await this.prisma.coachMessage.create({
      data: { user_id: userId, role, content },
    });
  }

  /** Last N turns, oldest first — the provider's conversation context. */
  async history(userId: string, limit = 20): Promise<CoachChatTurn[]> {
    const rows = await this.prisma.coachMessage.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
    return rows.reverse().map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
    }));
  }

  async historyWithMeta(userId: string, limit = 50) {
    const rows = await this.prisma.coachMessage.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
    return rows.reverse().map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      created_at: r.created_at,
    }));
  }

  // --- internals -------------------------------------------------------------

  private targetsFromProfile(
    profile: {
      sex: string;
      birth_date: Date;
      height_cm: unknown;
      weight_kg: unknown;
      activity_level: string;
      goal: string;
      target_weight_kg: unknown;
      target_date: Date | null;
    },
    now: Date,
  ) {
    const weeksToTarget = profile.target_date
      ? (profile.target_date.getTime() - now.getTime()) / MS_PER_WEEK
      : undefined;
    const t = computeTargets({
      sex: profile.sex as Sex,
      ageYears: Math.floor(
        (now.getTime() - profile.birth_date.getTime()) /
          (365.25 * 24 * 3600 * 1000),
      ),
      heightCm: Number(profile.height_cm),
      weightKg: Number(profile.weight_kg),
      activityLevel: profile.activity_level as ActivityLevel,
      goal: profile.goal as Goal,
      targetWeightKg:
        profile.target_weight_kg == null
          ? undefined
          : Number(profile.target_weight_kg),
      weeksToTarget:
        weeksToTarget != null && weeksToTarget > 0 ? weeksToTarget : undefined,
    });
    return {
      calories_kcal: t.calories_kcal,
      protein_g: t.protein_g,
      carbs_g: t.carbs_g,
      fat_g: t.fat_g,
      water_ml: t.water_ml,
    };
  }

  private async journalTotals(
    userId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Omit<DayTotals, "water_ml">> {
    const agg = await this.prisma.journalEntry.aggregate({
      where: { user_id: userId, eaten_on: { gte: dayStart, lt: dayEnd } },
      _sum: { kcal: true, protein_g: true, carbs_g: true, fat_g: true },
    });
    return {
      kcal: Math.round(Number(agg._sum.kcal ?? 0)),
      protein_g: Math.round(Number(agg._sum.protein_g ?? 0) * 10) / 10,
      carbs_g: Math.round(Number(agg._sum.carbs_g ?? 0) * 10) / 10,
      fat_g: Math.round(Number(agg._sum.fat_g ?? 0) * 10) / 10,
    };
  }

  private async hydrationTotal(
    userId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<number> {
    const agg = await this.prisma.hydrationEntry.aggregate({
      where: { user_id: userId, drunk_at: { gte: dayStart, lt: dayEnd } },
      _sum: { amount_ml: true },
    });
    return agg._sum.amount_ml ?? 0;
  }

  private async recentWeights(userId: string, upTo: Date) {
    const rows = await this.prisma.weightEntry.findMany({
      where: {
        user_id: userId,
        measured_at: { gte: new Date(upTo.getTime() - 30 * DAY_MS), lte: upTo },
      },
      orderBy: { measured_at: "asc" },
    });
    return rows.map((r) => ({
      date: r.measured_at.toISOString(),
      kg: Number(r.weight_kg),
    }));
  }
}
