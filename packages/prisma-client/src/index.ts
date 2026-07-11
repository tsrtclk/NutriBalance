import { PrismaClient } from "@prisma/client";

let _client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_client) {
    _client = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "warn", "error"]
          : ["warn", "error"],
    });
  }
  return _client;
}

export * from "@prisma/client";
