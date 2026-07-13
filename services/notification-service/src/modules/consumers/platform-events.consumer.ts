import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@platform/service-kit";
import {
  consumePlatformEvents,
  type ConsumerHandle,
  type PlatformEvent,
} from "@platform/events";

import { PreferencesRepository } from "../preferences/preferences.repository";
import { NotificationsService } from "../notifications/notifications.service";
import {
  badgeEarnedMessage,
  challengeCompletedMessage,
  goalReachedMessage,
  isGoalReached,
} from "../notifications/reminder-rules";
import type { AppConfig } from "../../config/configuration";

const QUEUE = "notification-service";

/**
 * É9 — bus subscriber: `weight.logged` (É7) feeds the "alerte objectif
 * atteint"; `badge.earned` / `challenge.completed` (É10) feed the
 * celebration notifications. Best-effort: a broker outage logs a warning and
 * the service keeps serving its API; the durable queue catches up on
 * reconnect.
 */
@Injectable()
export class PlatformEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformEventsConsumer.name);
  private handle?: ConsumerHandle;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
    private readonly preferences: PreferencesRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get("rabbitmq", { infer: true }).url;
    try {
      this.handle = await consumePlatformEvents({
        url,
        queue: QUEUE,
        patterns: ["weight.logged", "badge.earned", "challenge.completed"],
        handler: (event) => this.onEvent(event),
        onError: (err) => this.logger.warn(`event handler failed: ${err}`),
      });
      this.logger.log(
        "consuming platform events (weight.logged, badge.earned, challenge.completed)",
      );
    } catch (e) {
      this.logger.warn(`event consumer connect failed: ${e}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.handle?.close();
  }

  private async onEvent(event: PlatformEvent): Promise<void> {
    if (event.event === "badge.earned" || event.event === "challenge.completed")
      return this.onGamification(event);
    if (event.event !== "weight.logged") return;
    const { user_id, weight_kg } = event.data as {
      user_id: string;
      weight_kg: number;
    };

    const prefs = await this.preferences.get(user_id);
    if (!prefs.goal_alerts_enabled) return;

    // backlog: X3 — cross-service read of the profile's goal on the shared DB.
    const profile = await this.prisma.profile.findUnique({
      where: { user_id },
      select: { goal: true, target_weight_kg: true },
    });
    if (!profile) return;
    const target =
      profile.target_weight_kg == null
        ? null
        : Number(profile.target_weight_kg);
    if (!isGoalReached(profile.goal, target, weight_kg)) return;

    await this.notifications.dispatch(user_id, goalReachedMessage(target!));
  }

  /** É10 celebrations, gated by the per-type toggle (É12). */
  private async onGamification(event: PlatformEvent): Promise<void> {
    const data = event.data as {
      user_id: string;
      code: string;
      title: string;
      week_start?: string;
    };
    const prefs = await this.preferences.get(data.user_id);
    if (!prefs.gamification_enabled) return;
    const message =
      event.event === "badge.earned"
        ? badgeEarnedMessage(data.code, data.title)
        : challengeCompletedMessage(data.week_start ?? "", data.title);
    await this.notifications.dispatch(data.user_id, message);
  }
}
