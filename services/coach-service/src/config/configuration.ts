/** Config loader — a superset of ServiceKitConfig (redis + jwt) plus this
 * service's own settings. */
export interface AppConfig {
  nodeEnv: "development" | "staging" | "production" | "test";
  port: number;
  corsOrigin: string;
  database: { url: string };
  redis: { url: string; keyPrefix: string };
  rabbitmq: { url: string; exchange: string };
  jwt: { accessSecret: string; issuer: string };
  /** backlog: D9 — which CoachLlmProvider to bind (swappable-providers
   * convention): deterministic mock for dev/CI, Claude for prod. The
   * Anthropic SDK reads ANTHROPIC_API_KEY from the environment itself. */
  coach: {
    provider: "mock" | "claude";
    model: string;
    maxTokens: number;
    adviceCacheTtlSec: number;
    reportCacheTtlSec: number;
  };
}

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig["nodeEnv"]) || "development",
  port: parseInt(process.env.PORT || "3007", 10),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  database: { url: process.env.DATABASE_URL! },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    // backlog: X1 — every service must use the SAME prefix: the kit's JWT
    // strategy reads the `bl:access:*` blacklist through this prefix.
    keyPrefix: process.env.REDIS_KEY_PREFIX || "nb:",
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost:5672",
    exchange: process.env.RABBITMQ_EXCHANGE || "platform.events",
  },
  jwt: {
    accessSecret: process.env.JWT_SECRET!,
    issuer: process.env.JWT_ISSUER || "platform",
  },
  coach: {
    provider:
      (process.env.COACH_PROVIDER as AppConfig["coach"]["provider"]) ||
      (process.env.NODE_ENV === "production" && process.env.ANTHROPIC_API_KEY
        ? "claude"
        : "mock"),
    model: process.env.COACH_MODEL || "claude-opus-4-8",
    maxTokens: parseInt(process.env.COACH_MAX_TOKENS || "1024", 10),
    adviceCacheTtlSec: parseInt(
      process.env.COACH_ADVICE_CACHE_TTL_SEC || "21600", // 6h
      10,
    ),
    reportCacheTtlSec: parseInt(
      process.env.COACH_REPORT_CACHE_TTL_SEC || "86400", // 24h
      10,
    ),
  },
});
