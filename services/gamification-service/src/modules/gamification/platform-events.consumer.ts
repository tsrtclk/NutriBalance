import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  consumePlatformEvents,
  type ConsumerHandle,
  type PlatformEvent,
} from "@platform/events";

import { GamificationService } from "./gamification.service";
import { utcDayOf, type StreakKind } from "./streak-rules";
import type { AppConfig } from "../../config/configuration";

const QUEUE = "gamification-service";

const PATTERNS = [
  "journal.entry_logged",
  "workout.completed",
  "hydration.logged",
  "supplement.taken",
] as const;

/**
 * É10 — the entire feature is bus-driven: the four tracking events already
 * emitted by nutrition/workout services advance streaks, badges and défis.
 * Best-effort like the É9 consumer: a broker outage logs a warning and the
 * read API keeps serving; the durable queue catches up on reconnect.
 */
@Injectable()
export class PlatformEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformEventsConsumer.name);
  private handle?: ConsumerHandle;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly gamification: GamificationService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get("rabbitmq", { infer: true }).url;
    try {
      this.handle = await consumePlatformEvents({
        url,
        queue: QUEUE,
        patterns: [...PATTERNS],
        handler: (event) => this.onEvent(event),
        onError: (err) => this.logger.warn(`event handler failed: ${err}`),
      });
      this.logger.log(`consuming platform events (${PATTERNS.join(", ")})`);
    } catch (e) {
      this.logger.warn(`event consumer connect failed: ${e}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.handle?.close();
  }

  private async onEvent(event: PlatformEvent): Promise<void> {
    const mapped = this.toActivity(event);
    if (!mapped) return;
    await this.gamification.handleActivity(
      mapped.userId,
      mapped.kind,
      mapped.day,
    );
  }

  /** Event → (kind, domain day). Journal uses its (backdatable) eaten_on. */
  private toActivity(
    event: PlatformEvent,
  ): { userId: string; kind: StreakKind; day: string } | null {
    const data = event.data as Record<string, unknown>;
    const userId = data.user_id;
    if (typeof userId !== "string") return null;
    switch (event.event) {
      case "journal.entry_logged":
        return {
          userId,
          kind: "journal",
          day: utcDayOf(String(data.eaten_on ?? event.occurred_at)),
        };
      case "hydration.logged":
        return {
          userId,
          kind: "hydration",
          day: utcDayOf(String(data.drunk_at ?? event.occurred_at)),
        };
      case "supplement.taken":
        return {
          userId,
          kind: "supplement",
          day: utcDayOf(String(data.taken_at ?? event.occurred_at)),
        };
      case "workout.completed":
        return { userId, kind: "workout", day: utcDayOf(event.occurred_at) };
      default:
        return null;
    }
  }
}
