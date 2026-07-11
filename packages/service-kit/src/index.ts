// Shared NestJS scaffolding for Köydaş verify-only services: JWT auth (Passport
// strategy + module), Prisma + Redis modules, and the common decorators, DTOs,
// filters, guards, interceptors and interfaces. Each service supplies its own
// `configuration.ts` (a superset of ServiceKitConfig) + feature modules.
export * from "./config.types";
export * from "./geo";

export * from "./common/decorators/current-user.decorator";
export * from "./common/decorators/public.decorator";
export * from "./common/decorators/roles.decorator";
export * from "./common/decorators/min-auth-level.decorator";

export * from "./common/dto/api-response.dto";
export * from "./common/dto/pagination.dto";

export * from "./common/filters/http-exception.filter";
export * from "./common/filters/prisma-exception.filter";

export * from "./common/guards/jwt-auth.guard";
export * from "./common/guards/auth-level.guard";
export * from "./common/guards/roles.guard";

export * from "./common/interceptors/transform.interceptor";
export * from "./common/interceptors/audit.interceptor";

export * from "./common/interfaces/user-payload.interface";

export * from "./prisma/prisma.service";
export * from "./prisma/prisma.module";

export * from "./redis/redis.service";
export * from "./redis/redis.module";

export * from "./auth/jwt-access.strategy";
export * from "./auth/auth.module";
export * from "./sync/sync.types";
export * from "./sync/sync.engine";
