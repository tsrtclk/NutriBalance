import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqplib";

import { PLATFORM_EXCHANGE, type PlatformEventName } from "./events";

type Conn = Awaited<ReturnType<typeof amqp.connect>>;
type Chan = Awaited<ReturnType<Conn["createChannel"]>>;

/**
 * Publisher for Köydaş domain events. Best-effort: a broker outage logs a
 * warning and the caller's request still succeeds — events are fire-and-forget,
 * never on the critical path. Inject and call `publish(name, data)`.
 */
@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly url: string;
  private readonly source: string;
  private conn?: Conn;
  private channel?: Chan;

  constructor(config: ConfigService) {
    this.url =
      config.get<string>("rabbitmq.url") ??
      process.env.RABBITMQ_URL ??
      "amqp://localhost:5672";
    this.source = process.env.SERVICE_NAME ?? "koydas";
  }

  async onModuleInit(): Promise<void> {
    await this.connect().catch((e) =>
      this.logger.warn(`event bus connect failed: ${e}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.conn?.close().catch(() => undefined);
  }

  private async connect(): Promise<void> {
    this.conn = await amqp.connect(this.url);
    this.channel = await this.conn.createChannel();
    await this.channel.assertExchange(PLATFORM_EXCHANGE, "topic", {
      durable: true,
    });
  }

  /** Publish a domain event. Swallows errors (logs a warning). */
  async publish(
    event: PlatformEventName,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      if (!this.channel) await this.connect();
      const envelope = {
        event,
        occurred_at: new Date().toISOString(),
        source: this.source,
        data,
      };
      this.channel!.publish(
        PLATFORM_EXCHANGE,
        event,
        Buffer.from(JSON.stringify(envelope)),
        {
          contentType: "application/json",
          persistent: true,
        },
      );
    } catch (e) {
      this.logger.warn(`failed to publish ${event}: ${e}`);
      // Drop the cached channel so the next publish reconnects.
      this.channel = undefined;
      this.conn = undefined;
    }
  }
}
