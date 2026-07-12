# AGENTS — NutriBalance

Canonical instructions for any LLM/agent working on **NutriBalance**. Product
facts live here; keep the _generic_ parts (this file's structure, the
disciplines below) in sync with the upstream `platform-skeleton` repo (see
`docs/architecture/upstream-sync.md`).

## Product

**NutriBalance** — nutrition, hydration, supplements & training tracking.
Profile-derived calorie/macro targets (Mifflin-St Jeor BMR + TDEE), food
journal (OpenFoodFacts + barcode scan), workout tracking with progressive
overload, progress curves, AI coach on the Claude API. The product backlog
(12 épics + MVP prioritisation) is `docs/product/backlog.md`. Épic 2 (auth)
is wired: `auth-service` is the only token issuer; É1 (profile + targets) and
the É7 weight curve live in `profile-service`.

## Stack

- **Runtime:** Node 24 LTS · **Backend:** NestJS 10 · TypeScript 5.4 · Turborepo
- **ORM:** Prisma 6 (PostgreSQL + PostGIS) · **Cache:** Redis · **Bus:** RabbitMQ
- **Gateway:** Kong (DB-less; services enforce JWT themselves)
- **Mobile:** Flutter (add your app shell under `mobile/`)

## Repo layout

```
packages/   service-kit, events, shared-types, prisma-client, domain
            (pure product formulas — computeTargets lives here)
services/   auth-service (the ONLY token issuer) · profile-service
            (verify-only; the reference shape for new services) ·
            nutrition-service (É3/É4/É5 foods + journal + hydration +
            supplements, swappable OFF provider) ·
            workout-service (É6 library/séances/progression/suggestion) ·
            notification-service (É9 reminders + bus consumer + inbox) ·
            coach-service (É8 Claude coach behind a swappable LLM port)
e2e/        Cucumber harness (live API through Kong)
infra/      docker-compose + Kong skeleton
docs/architecture/backlog.md   working-protocol
.agents/skills/                generic skills
```

## Build / test (run the full set locally before every push)

```bash
npm run prisma:generate         # before typecheck after schema changes
npm run lint && npm run format:check
npm run typecheck
npm run test
npm run infra:up && npm run prisma:migrate:deploy && npm run test:e2e   # live e2e
```

## Service kit

New verify-only services import the shared scaffold from **`@platform/service-kit`**
instead of copy-pasting it: common decorators / DTOs / filters / guards /
interceptors / interfaces + `PrismaModule`, `RedisModule`, verify-only
`AuthModule`, and the `geo` PostGIS helper. A service supplies only its own
`configuration.ts` (a **superset of `ServiceKitConfig`** — must provide `redis`

- `jwt`) and its feature modules. `profile-service` is the reference shape.
  The kit also ships the offline-sync replay `SyncEngine` (idempotent on
  `client_op_id`, `entity_versions` bump, per-`operation_type` handler
  dispatch) — see the `offline-first-mobile` skill for the full pattern.

## Event bus

Publish domain events to the `platform.events` topic exchange via
**`@platform/events`**: import `EventBusModule`, inject `EventBusService`, and
`await this.events.publish('<name>', data)` after a notable write — **best-effort**
(a broker outage logs a warning, never breaks the request). Consumers use
`consumePlatformEvents({ url, queue, patterns, handler })`. Add a new event to
`PLATFORM_EVENTS` in `packages/events/src/events.ts`.

## Geometry

Prisma can't bind `geometry(...)` columns, so geo repos use raw `$queryRaw` with
the **`geo`** helper (in `@platform/service-kit`): `fromGeoJson` (insert/update,
null-safe), `asGeoJson` (select), `withinKm` (ST_DWithin), `distanceKm`,
`nearest` (KNN order). They return composable `Prisma.Sql` fragments. uuid PKs
are DB-generated so raw inserts omit `id`.

## Backlog discipline (way of working)

`docs/architecture/backlog.md` is the project's **memory of deferred work and
undefined rules** — maintaining it is **part of Definition of Done for every
slice**. Items have stable IDs (`D#` decision, `B#` feature, `X#` cross-cutting);
reference them from code (`// backlog: D3`), commits, and PRs.

1. **Open** — read the backlog; note what your slice depends on / unblocks.
2. **Build** — every default / `TODO` / stub / skipped-rule gets a backlog item
   with its ID in the code comment.
3. **Close** — sweep the dependency ledger: tick what your slice unblocked, add
   new items, bump "Last updated", add a changelog line.

## Skills discipline (way of working)

When a slice **establishes or changes a reusable pattern** (a service shape, an
architectural rule, a recurring gotcha, a cross-cutting capability), **create or
update the matching skill** under `.agents/skills/`; fix/delete stale ones in the
same PR. Write skills **generic-first, specifics isolated**: the `SKILL.md` body
is the product-agnostic procedure; product-specifics go in a labelled section or
`references/<topic>.md`. Generic skills + patterns are **ported back upstream to
`platform-skeleton`**.

**Consult skills before you build or test** — don't re-derive what a skill
documents. Shipped set: `gitflow-feature-branch`, `nestjs-layered-module`,
`ci-failure-triage`, `cucumber-api-e2e`, `flutter-integration-testing`,
`docker-compose-microservices`, `mobile-ux-review` (review lens + UX-layer
architecture), `new-service`, `domain-scoring` (pure selector + persist),
`offline-first-mobile` (sync queue + replay engine), `product-telemetry`,
`agent-context-management`, `accessibility-benchmarks` (with
`docs/accessibility/` checklists), `mobile-ui-revamp`,
`incremental-i18n-rollout`.

## Context management (way of working)

Agent sessions compact/reset; the repo does not. Externalize state as you work
(the `agent-context-management` skill is the full playbook):

- Ledgers are the memory: `backlog.md` / `ux-backlog.md` (+ any product
  ledgers: spec coverage, upstream-sync, release checklist) updated **at the
  moment of change**.
- Spend tokens like money: script-driven bulk edits, filtered log output
  (`grep`/`tail`, full logs to a file), background long jobs, batched calls.
- After a reset: AGENTS.md → ledgers → task tracker → `git log` — trust files
  over recalled conversation.

## UI integration tests (way of working)

When the product has a mobile app, drive the **real screens against the live
compose stack** (the UI counterpart of the Cucumber suite): one authenticated
journey whose steps each prove a feature end-to-end. Real login via a
**dev-only, env-gated OTP-echo endpoint** (the test's stand-in for reading the
SMS — compose-only, never prod). A screen change adds/extends a journey step.
Patterns + flake-killers: the `flutter-integration-testing` skill. UX smells
found while testing go to `docs/architecture/ux-backlog.md`.

## Swappable providers (convention)

When a capability needs an external provider that isn't chosen/credentialed yet
(SMS/push, weather, payments, maps), ship the feature behind an **abstract
provider port with a mock/deterministic implementation bound in DI**, tag the
binding with the backlog ID, and swap when the real one lands. UI capability
views **degrade gracefully** without the token (placeholder instead of crash) so
dev/CI/tests run unconfigured.

## Docker for local testing

The rebuild→verify loop, the gateway DNS-cache 404, and the disk-full →
wedged-daemon recovery live in
[`docs/runbooks/docker-local-testing.md`](./docs/runbooks/docker-local-testing.md)
— read it before fighting Docker.

## Conventions that trip LLMs up

1. `prisma:generate` before `typecheck` after a schema change.
2. Workspace packages share one root lockfile — don't make per-package locks.
3. Services import shared packages via tsconfig **path aliases**
   (`@platform/*`); the runtime resolves them via `tsconfig-paths` +
   `infra/docker/runtime-tsconfig.json` — add new packages to **both** path maps.
4. uuid PKs are DB-generated; raw inserts omit `id` + `updated_at` defaults.
5. Verify-only services never issue tokens — that's `auth-service`'s job.
6. Gateway has no global JWT plugin — each service enforces auth (`@Public`
   exempts login/refresh).
7. All services share ONE Redis key prefix (`nb:`, backlog X1): the kit's JWT
   strategy reads the `bl:access:*` blacklist through it — a per-service
   prefix silently breaks logout/revocation.
