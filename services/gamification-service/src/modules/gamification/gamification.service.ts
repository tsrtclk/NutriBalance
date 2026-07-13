import { Injectable, Logger } from "@nestjs/common";
import { EventBusService } from "@platform/events";

import { GamificationRepository } from "./gamification.repository";
import {
  advanceStreak,
  effectiveCurrent,
  utcDayOf,
  STREAK_KINDS,
  type StreakKind,
  EMPTY_STREAK,
} from "./streak-rules";
import { badgeTitle, newlyEarnedBadges } from "./badge-rules";
import {
  advanceChallenge,
  challengeByCode,
  challengeForWeek,
  mondayOf,
} from "./challenge-rules";

export interface StreakView {
  current: number;
  best: number;
  last_day: string | null;
  events_total: number;
}

export interface ChallengeView {
  week_start: string;
  code: string;
  title: string;
  kind: StreakKind;
  metric: "days" | "count";
  target: number;
  progress: number;
  completed: boolean;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly repo: GamificationRepository,
    private readonly events: EventBusService,
  ) {}

  /**
   * One activity event = advance the kind's streak, award any badges it
   * unlocked, and move the week's défi. `day` is the domain day of the
   * activity (a backdated journal entry advances the day it belongs to).
   */
  async handleActivity(
    userId: string,
    kind: StreakKind,
    day: string,
  ): Promise<void> {
    const streak = advanceStreak(await this.repo.getStreak(userId, kind), day);
    await this.repo.saveStreak(userId, kind, streak);

    const already = await this.repo.badgeCodes(userId);
    const earned = newlyEarnedBadges(kind, streak, already);
    await this.repo.awardBadges(userId, earned);
    for (const code of earned) {
      await this.events.publish("badge.earned", {
        user_id: userId,
        code,
        title: badgeTitle(code),
      });
    }

    await this.advanceWeeklyChallenge(userId, kind, day);
  }

  private async advanceWeeklyChallenge(
    userId: string,
    kind: StreakKind,
    day: string,
  ): Promise<void> {
    const weekStart = mondayOf(day);
    const row = await this.repo.getChallenge(userId, weekStart);
    // The def is frozen on the row at first write, so a catalogue reshuffle
    // never re-targets a week already in progress.
    const def =
      (row && challengeByCode(row.code)) ?? challengeForWeek(weekStart);
    if (row?.completed_at) return;
    const prev = {
      progress: row?.progress ?? 0,
      last_day: row?.last_day ? row.last_day.toISOString().slice(0, 10) : null,
    };
    const next = advanceChallenge(def, prev, kind, day);
    if (next.progress === prev.progress && row) return;
    await this.repo.upsertChallenge(userId, weekStart, {
      code: def.code,
      target: def.target,
      progress: next.progress,
      last_day: next.last_day,
      completed: next.justCompleted,
    });
    if (next.justCompleted) {
      await this.events.publish("challenge.completed", {
        user_id: userId,
        code: def.code,
        title: def.title,
        week_start: weekStart,
      });
    }
  }

  /** All four chains, valued as of `now` (a stale chain reads 0 — D10). */
  async streaks(
    userId: string,
    now = new Date(),
  ): Promise<Record<StreakKind, StreakView>> {
    const today = utcDayOf(now.toISOString());
    const stored = await this.repo.getStreaks(userId);
    const out = {} as Record<StreakKind, StreakView>;
    for (const kind of STREAK_KINDS) {
      const s = stored[kind] ?? EMPTY_STREAK;
      out[kind] = {
        current: effectiveCurrent(s, today),
        best: s.best_len,
        last_day: s.last_day,
        events_total: s.events_total,
      };
    }
    return out;
  }

  async badges(
    userId: string,
  ): Promise<{ code: string; title: string; earned_at: Date }[]> {
    const rows = await this.repo.listBadges(userId);
    return rows.map((r) => ({
      code: r.code,
      title: badgeTitle(r.code),
      earned_at: r.earned_at,
    }));
  }

  /** The current week's défi, materialised or not (progress 0 before any event). */
  async challenge(userId: string, now = new Date()): Promise<ChallengeView> {
    const weekStart = mondayOf(utcDayOf(now.toISOString()));
    const row = await this.repo.getChallenge(userId, weekStart);
    const def =
      (row && challengeByCode(row.code)) ?? challengeForWeek(weekStart);
    return {
      week_start: weekStart,
      code: def.code,
      title: def.title,
      kind: def.kind,
      metric: def.metric,
      target: def.target,
      progress: row?.progress ?? 0,
      completed: row?.completed_at != null,
    };
  }
}
