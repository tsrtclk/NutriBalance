import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

import type { ServiceKitConfig } from "../config.types";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly prefix: string;

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<ServiceKitConfig, true>,
  ) {
    const url = this.config.get("redis", { infer: true }).url;
    this.prefix = this.config.get("redis", { infer: true }).keyPrefix;
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.client.on("error", (e) =>
      this.logger.error(`Redis error: ${e.message}`),
    );
    this.client.on("connect", () => this.logger.log("Redis connected"));
  }

  private k(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(this.k(key));
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(this.k(key), value, "EX", ttlSeconds);
    } else {
      await this.client.set(this.k(key), value);
    }
  }

  async setNx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(
      this.k(key),
      value,
      "EX",
      ttlSeconds,
      "NX",
    );
    return result === "OK";
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys.map((k) => this.k(k)));
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(this.k(key));
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(this.k(key), ttlSeconds);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(this.k(key))) === 1;
  }

  /** Atomic increment-and-set-TTL (rate limiter primitive). */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const pipe = this.client.multi();
    pipe.incr(this.k(key));
    pipe.expire(this.k(key), ttlSeconds);
    const result = await pipe.exec();
    return Number(result?.[0]?.[1] ?? 0);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  /** Escape hatch for tests. Do NOT import this in production code. */
  getRawClient(): Redis {
    return this.client;
  }
}
