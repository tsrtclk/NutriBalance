import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { BadgeAward, ChallengeProgress } from "@platform/prisma-client";

import {
  EMPTY_STREAK,
  type StreakKind,
  type StreakState,
} from "./streak-rules";

const toDay = (d: Date | null): string | null =>
  d ? d.toISOString().slice(0, 10) : null;

@Injectable()
export class GamificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getStreak(userId: string, kind: StreakKind): Promise<StreakState> {
    const row = await this.prisma.gamificationStreak.findUnique({
      where: { user_id_kind: { user_id: userId, kind } },
    });
    if (!row) return { ...EMPTY_STREAK };
    return {
      current_len: row.current_len,
      best_len: row.best_len,
      last_day: toDay(row.last_day),
      events_total: row.events_total,
    };
  }

  async getStreaks(
    userId: string,
  ): Promise<Partial<Record<StreakKind, StreakState>>> {
    const rows = await this.prisma.gamificationStreak.findMany({
      where: { user_id: userId },
    });
    const out: Partial<Record<StreakKind, StreakState>> = {};
    for (const row of rows) {
      out[row.kind as StreakKind] = {
        current_len: row.current_len,
        best_len: row.best_len,
        last_day: toDay(row.last_day),
        events_total: row.events_total,
      };
    }
    return out;
  }

  async saveStreak(
    userId: string,
    kind: StreakKind,
    state: StreakState,
  ): Promise<void> {
    const data = {
      current_len: state.current_len,
      best_len: state.best_len,
      last_day: state.last_day ? new Date(`${state.last_day}T00:00:00Z`) : null,
      events_total: state.events_total,
    };
    await this.prisma.gamificationStreak.upsert({
      where: { user_id_kind: { user_id: userId, kind } },
      create: { user_id: userId, kind, ...data },
      update: data,
    });
  }

  listBadges(userId: string): Promise<BadgeAward[]> {
    return this.prisma.badgeAward.findMany({
      where: { user_id: userId },
      orderBy: { earned_at: "desc" },
    });
  }

  async badgeCodes(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.badgeAward.findMany({
      where: { user_id: userId },
      select: { code: true },
    });
    return new Set(rows.map((r) => r.code));
  }

  /** Composite PK + skipDuplicates makes redelivered events award nothing. */
  async awardBadges(userId: string, codes: string[]): Promise<void> {
    if (codes.length === 0) return;
    await this.prisma.badgeAward.createMany({
      data: codes.map((code) => ({ user_id: userId, code })),
      skipDuplicates: true,
    });
  }

  getChallenge(
    userId: string,
    weekStart: string,
  ): Promise<ChallengeProgress | null> {
    return this.prisma.challengeProgress.findUnique({
      where: {
        user_id_week_start: {
          user_id: userId,
          week_start: new Date(`${weekStart}T00:00:00Z`),
        },
      },
    });
  }

  async upsertChallenge(
    userId: string,
    weekStart: string,
    data: {
      code: string;
      target: number;
      progress: number;
      last_day: string | null;
      completed: boolean;
    },
  ): Promise<void> {
    const week = new Date(`${weekStart}T00:00:00Z`);
    const lastDay = data.last_day
      ? new Date(`${data.last_day}T00:00:00Z`)
      : null;
    await this.prisma.challengeProgress.upsert({
      where: { user_id_week_start: { user_id: userId, week_start: week } },
      create: {
        user_id: userId,
        week_start: week,
        code: data.code,
        target: data.target,
        progress: data.progress,
        last_day: lastDay,
        completed_at: data.completed ? new Date() : null,
      },
      update: {
        progress: data.progress,
        last_day: lastDay,
        ...(data.completed ? { completed_at: new Date() } : {}),
      },
    });
  }
}
