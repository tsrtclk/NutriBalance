import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "@platform/service-kit";

import { PreferencesRepository } from "../preferences/preferences.repository";
import { NotificationsService } from "../notifications/notifications.service";
import {
  hydrationDue,
  hydrationReminder,
  mealReminder,
  supplementReminder,
  workoutReminder,
} from "../notifications/reminder-rules";

const TICK_MS = 60_000;

/**
 * É9 — the minute tick: fires meal/hydration/workout reminders from stored
 * preferences and supplement reminders from the supplements schedule
 * (backlog: X3 — cross-service table read on the shared DB). The inbox
 * dedupe key makes overlapping ticks harmless.
 *
 * backlog: D7 — "HH:MM" schedules are UTC until per-user timezones land.
 * backlog: B18 — full-table scan per tick; shard/queue before real scale.
 */
@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    private readonly preferences: PreferencesRepository,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Interval(TICK_MS)
  async tick(now = new Date()): Promise<void> {
    try {
      const hhmm = now.toISOString().slice(11, 16);
      const dateIso = now.toISOString().slice(0, 10);
      const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();

      const prefs = await this.preferences.listAll();
      for (const p of prefs) {
        if (p.meals_enabled && p.meal_times.includes(hhmm)) {
          await this.notifications.dispatch(
            p.user_id,
            mealReminder(dateIso, hhmm),
          );
        }
        if (
          p.hydration_enabled &&
          hydrationDue(minutes, p.hydration_every_min)
        ) {
          await this.notifications.dispatch(
            p.user_id,
            hydrationReminder(dateIso, hhmm),
          );
        }
        if (p.workout_enabled && p.workout_time === hhmm) {
          await this.notifications.dispatch(
            p.user_id,
            workoutReminder(dateIso, hhmm),
          );
        }
      }

      // Supplement schedules live on the supplements themselves (É5).
      const dueSupplements = await this.prisma.supplement.findMany({
        where: { active: true, times: { has: hhmm } },
        select: { id: true, user_id: true, name: true },
      });
      const optedOut = new Set(
        prefs.filter((p) => !p.supplements_enabled).map((p) => p.user_id),
      );
      for (const s of dueSupplements) {
        if (optedOut.has(s.user_id)) continue;
        await this.notifications.dispatch(
          s.user_id,
          supplementReminder(dateIso, hhmm, s.name, s.id),
        );
      }
    } catch (e) {
      // The next tick retries; reminders must never crash the service.
      this.logger.warn(`reminder tick failed: ${e}`);
    }
  }
}
