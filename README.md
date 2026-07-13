# NutriBalance

Nutrition, hydration, supplements & training tracking. Calorie/macro targets
computed from the user's profile (Mifflin-St Jeor BMR + TDEE), a food journal
backed by OpenFoodFacts + barcode scan, workout tracking with progressive
overload, progress curves, and an AI coach on the Claude API.

Built from **[platform-skeleton](https://github.com/tsrtclk/platform-skeleton)**
(Turborepo + NestJS + Flutter): this repo reuses the skeleton's service-kit,
event bus, e2e harness, and working protocol instead of re-deriving them.

## Product backlog

`docs/product/backlog.md` holds the 12 épics. Suggested MVP path:

1. **Épics 1, 3, 6, 7** — profile & onboarding, food tracking, workouts,
   progress → basic functional app.
2. **Épics 4, 5, 9** — hydration, supplements, notifications → daily comfort.
3. **Épics 8, 10, 11** — AI coach, gamification, integrations →
   differentiation / added value.

Épic 2 (auth) is **wired**: `services/auth-service` is the only token issuer
(register/login/refresh-rotation/logout); every other service verifies through
`@platform/service-kit`.

## What's in it

```
packages/
  domain/         pure NutriBalance domain functions shared across services
                  (computeTargets — Mifflin-St Jeor/TDEE/macros/water)
  service-kit/    verify-only NestJS scaffold: common decorators/dto/filters/
                  guards/interceptors/interfaces + Prisma/Redis/Auth modules,
                  ServiceKitConfig, the `geo` PostGIS query helper, and the
                  offline-sync replay SyncEngine
  events/         RabbitMQ topic-exchange bus: EventBusModule (publisher),
                  consumePlatformEvents (consumer), typed event registry
  shared-types/   cross-service types (currency, locale, result, GeoJSON, auth level)
  prisma-client/  the NutriBalance Prisma schema (users, profiles,
                  weight_entries + kit models) + migrations + client
services/
  auth-service/     É2 — the ONLY token-issuing service: register/login,
                    refresh rotation (Redis-pinned jti), logout blacklist
  profile-service/  É1+É7 — profile upsert, GET /profile/targets (pure
                    computeTargets: Mifflin-St Jeor BMR → TDEE → paced
                    calories → macros + water), weight entries (the curve).
                    This is the reference service shape — copy it for new ones.
  nutrition-service/ É3+É4+É5 — food search/barcode via a swappable provider
                    port (OpenFoodFacts or deterministic mock), custom foods,
                    favorites/recents, journal with snapshot macros + day
                    totals; hydration quick-add + day totals; supplements
                    (dosage/horaires + intake history)
  workout-service/  É6 — seeded exercise library (+ custom), sessions
                    (sets×reps×poids, RPE, MET kcal estimate), per-exercise
                    progression curve, next-session suggestion (48h recovery)
  notification-service/ É9 — reminder scheduler (repas/eau/compléments/
                    séance), weight.logged consumer → alerte objectif,
                    deduped inbox, swappable push provider (mock until B17)
  coach-service/    É8 — IA coach on the Claude API behind a swappable LLM
                    port (deterministic mock without a key): conseil du jour,
                    chat with history, bilan hebdo, plateau detection
  gamification-service/ É10 — streaks, badges and défis hebdo, entirely
                    driven by the event bus (no writes of its own); É12
                    display units live in profile-service (/settings)
e2e/              Cucumber/Gherkin harness driving the live API (generic steps)
infra/docker/     compose + Kong skeleton + runtime tsconfig
scripts/          smoke-tests.sh — one endpoint per service through the gateway
docs/product/backlog.md        the NutriBalance product backlog (épics + MVP)
docs/architecture/backlog.md   the working-protocol (deferred work + decisions)
docs/architecture/upstream-sync.md   ledger: generic changes to port upstream
docs/accessibility/            WCAG 2.2 / EAA / RGAA / APCA checklists
.agents/skills/   generic, product-agnostic skills
AGENTS.md         the methodology any LLM/agent follows in this repo
```

## Conventions (the load-bearing ones)

- **Verify-only services.** Services validate JWTs minted by a separate auth
  service; they never issue tokens. `service-kit`'s `AuthModule` is verify-only.
- **One source of truth for scaffolding.** New services import
  `@platform/service-kit` — never copy it. A service supplies only its
  `configuration.ts` (a superset of `ServiceKitConfig`) + feature modules.
- **Geometry via the `geo` helper.** Prisma can't bind `geometry(...)`; geo
  repos use raw `$queryRaw` with the `geo.*` `Prisma.Sql` fragments
  (`fromGeoJson`, `asGeoJson`, `withinKm`, `distanceKm`, `nearest`).
- **Events for notable writes.** Publish a domain event (`@platform/events`) on
  notable writes; consumers (analytics, notifications) subscribe to the bus.
- **DB-generated uuid PKs** (`@default(dbgenerated("gen_random_uuid()"))`) so
  raw-SQL inserts can omit `id`.
- **Env-driven throttle** (`THROTTLE_LIMIT`/`THROTTLE_TTL_MS`; prod 100/60s).

## Bootstrap status

- [x] Repo initiated from `platform-skeleton` + product backlog imported
- [x] Replace the example `Place`/`User` models with the NutriBalance domain
      (users + credentials, profiles, weight entries; food journal & workouts
      come with B2/B3)
- [x] Add services under `services/`: auth-service (É2), profile-service
      (É1 + É7 weight curve)
- [x] Wire the JWT-issuing auth service (Épic 2 — register/login/refresh)
- [x] Flutter app shell under `mobile/` — login/register/onboarding/dashboard
      journey, envelope-aware API client (backlog B12; per-épic screens → B21)

## Develop

```bash
npm run prisma:generate
npm run lint && npm run format:check && npm run typecheck && npm run test
npm run infra:up          # Postgres+PostGIS, Redis, RabbitMQ, Kong + the services
npm run prisma:migrate:deploy   # apply migrations (DATABASE_URL from .env)
npm run test:e2e          # Cucumber suite through Kong (auth/profile/weight)
```

## Methodology

See `AGENTS.md`:

- **Backlog discipline** — `docs/architecture/backlog.md` is the memory of
  deferred work + undefined rules; maintained every slice.
- **Skills discipline** — encode reusable patterns as skills under
  `.agents/skills/`, generic-first with product-specifics isolated.
- **Upstream sync** — when you improve a **generic** pattern here, add a row to
  `docs/architecture/upstream-sync.md` and port it back to `platform-skeleton`.
