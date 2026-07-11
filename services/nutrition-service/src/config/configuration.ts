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
  /** backlog: D3 — which FoodDataProvider to bind (swappable-providers
   * convention): deterministic mock for dev/CI, OpenFoodFacts for prod. */
  foodProvider: "mock" | "openfoodfacts";
  openFoodFacts: { baseUrl: string; timeoutMs: number };
}

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig["nodeEnv"]) || "development",
  port: parseInt(process.env.PORT || "3004", 10),
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
  foodProvider:
    (process.env.FOOD_PROVIDER as AppConfig["foodProvider"]) ||
    (process.env.NODE_ENV === "production" ? "openfoodfacts" : "mock"),
  openFoodFacts: {
    baseUrl: process.env.OFF_BASE_URL || "https://world.openfoodfacts.org",
    timeoutMs: parseInt(process.env.OFF_TIMEOUT_MS || "5000", 10),
  },
});
