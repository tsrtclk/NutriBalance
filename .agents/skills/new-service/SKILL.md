---
name: new-service
description:
  Add a new verify-only NestJS service to a platform-skeleton monorepo using
  @platform/service-kit (common scaffolding + Prisma/Redis/Auth + geo helper)
  and @platform/events. Covers the module/controller/service/repository shape,
  config superset, geometry via the geo helper, emitting domain events, and the
  tsconfig path + Kong route + docker-compose wiring. Triggers on "add a
  service", "new microservice", "scaffold a service".
license: MIT
best-for: All LLMs — procedural. Copy example-service, rename, swap the feature module.
metadata:
  generic: true
---

# Add a verify-only service

Copy `services/example-service` and adapt it. **Never copy `service-kit`** —
import it.

## 1. Scaffold

- Duplicate `services/example-service` → `services/<name>-service`; update
  `package.json` `name` → `@platform/<name>-service` and the Dockerfile/compose
  service name.
- Keep `src/config/configuration.ts` (a **superset of `ServiceKitConfig`** — must
  provide `redis` + `jwt`); set the service's `port` + `redis.keyPrefix`.
- `app.module.ts` imports `EventBusModule`, `PrismaModule`, `RedisModule`,
  `AuthModule` from the kit + your feature module, and an env-driven
  `ThrottlerModule` (`THROTTLE_LIMIT`/`THROTTLE_TTL_MS`, default 100/60s).

## 2. Feature module (the canonical shape)

`modules/<feature>/`: `dto/`, `<feature>.repository.ts`, `<feature>.service.ts`,
`<feature>.controller.ts`, `<feature>.module.ts`.

- Controller: `@UseGuards(JwtAuthGuard)`, `@UseFilters(HttpExceptionFilter,
PrismaExceptionFilter)`, `@UseInterceptors(TransformInterceptor)`; take the
  user from `@CurrentUser()`, never the body.
- Repository: typed Prisma client for non-geo tables; for `geometry(...)`
  columns use raw `$queryRaw` + the **`geo`** helper (`fromGeoJson`, `asGeoJson`,
  `withinKm`, `distanceKm`, `nearest`).
- Service: business rules + **emit a domain event** for notable writes
  (`this.events.publish('<name>', data)`); add the name to `PLATFORM_EVENTS`.

## 3. Wire it up

- Kong route in `infra/api-gateway/kong.yml` (or compose): `/api/v1/<prefix>` →
  `http://<name>-service:3000`.
- `docker-compose.yml`: a service block with `DATABASE_URL`, `REDIS_URL`,
  `RABBITMQ_URL`, `JWT_SECRET`, `THROTTLE_LIMIT`.
- No tsconfig change needed unless you add a new shared package (then update
  `tsconfig.base.json` **and** `infra/docker/runtime-tsconfig.json`).

## 4. Verify

`npm run typecheck && npm run lint`; rebuild the image; add a `.feature`
scenario for the new endpoints and run `npm run test:e2e`.

> After a service container is recreated it gets a new IP; Kong (DB-less) caches
> DNS — `docker compose restart kong` if routes 404.
