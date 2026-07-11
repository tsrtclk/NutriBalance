import * as amqp from "amqplib";

import { PLATFORM_EXCHANGE, type PlatformEvent } from "./events";

export interface ConsumerHandle {
  close(): Promise<void>;
}

export interface ConsumeOptions {
  url: string;
  /** Durable queue name owned by this consumer (one per logical subscriber). */
  queue: string;
  /** Topic binding patterns, e.g. `['emergency.#']` or `['#']` for everything. */
  patterns: string[];
  handler: (event: PlatformEvent) => void | Promise<void>;
  onError?: (err: unknown) => void;
}

/**
 * Bind a durable queue to the `platform.events` exchange and consume matching
 * events. Acks on success; nacks without requeue on a handler throw (so a
 * poison message doesn't loop). Returns a handle to close the connection.
 */
export async function consumePlatformEvents(
  opts: ConsumeOptions,
): Promise<ConsumerHandle> {
  const conn = await amqp.connect(opts.url);
  const channel = await conn.createChannel();
  await channel.assertExchange(PLATFORM_EXCHANGE, "topic", { durable: true });
  const q = await channel.assertQueue(opts.queue, { durable: true });
  for (const pattern of opts.patterns) {
    await channel.bindQueue(q.queue, PLATFORM_EXCHANGE, pattern);
  }

  await channel.consume(q.queue, (msg) => {
    if (!msg) return;
    void (async () => {
      try {
        const event = JSON.parse(msg.content.toString()) as PlatformEvent;
        await opts.handler(event);
        channel.ack(msg);
      } catch (err) {
        opts.onError?.(err);
        channel.nack(msg, false, false);
      }
    })();
  });

  return {
    async close() {
      await channel.close().catch(() => undefined);
      await conn.close().catch(() => undefined);
    },
  };
}
