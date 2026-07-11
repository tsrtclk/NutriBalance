# Upstream sync — ledger

> Your product repo is downstream of
> [`platform-skeleton`](https://github.com/tsrtclk/platform-skeleton) (the
> template). **Generic** improvements made here must be ported back upstream so
> other products inherit them — and skeleton improvements adopted here. This
> file is the running list of **what to sync** so the two don't drift. It is
> the companion to AGENTS.md's "port generic patterns upstream" rule.

## Protocol (every slice)

1. **During a slice**, ask: did I change something **generic** (a shared
   package, a service-shape convention, root tooling, a generic skill, the
   methodology docs, the infra/gateway skeleton, the e2e or integration-test
   harness, a reusable test affordance)? If yes → add a row to §3 with status
   `⏳ pending`.
2. **When you port it** upstream, flip the row to `✅ synced` with the date +
   skeleton PR/commit. When porting, rename your product scope (`@yourapp/*`)
   → `@platform/*` and strip product specifics.
3. **Project-specific work is NOT synced** — don't list it (see §2).

## What is generic (sync) vs. project-specific (don't)

**Sync ⤴**

- `packages/`: `service-kit`, `events`, `shared-types`, `prisma-client`
  **shell** (model shapes, not your domain tables)
- Root tooling: Turborepo, `tsconfig.base.json` + `runtime-tsconfig.json` path
  maps, ESLint/Prettier, the CI workflow
- Infra **skeleton**: docker-compose shape, the Kong/gateway skeleton + dev-only
  env-gating patterns (the **pattern**, never real secrets)
- Harnesses: the `e2e/` Cucumber harness + **generic** step vocabulary; the
  `mobile/integration_test/` harness shape
- `.agents/skills/` — the **generic** skills only
- Methodology docs: the backlog working-protocol, the `ux-backlog.md` `U#`
  protocol, this ledger's protocol, AGENTS.md template sections

**Don't sync ⛔**

- `services/*` business logic, `mobile/lib/features/*` screens, real Prisma
  migrations/domain schema, `.env*` and secrets, product facts,
  product-specific skills.

## 3. Ledger

Newest first. `Status`: ⏳ pending · ✅ synced (date · skeleton ref).

| Generic change                                                                                                                                                                                          | Origin (PR/slice)           | Status     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------- |
| `service-kit`: `UserPayload` made product-neutral (generic `email` identifier, dropped `cooperativeIds`); auth module/strategy/guard comments + error messages de-Köydaş'ed (English, no service names) | 2026-07-11 foundation slice | ⏳ pending |
| `events`: publisher doc/source label de-Köydaş'ed (`SERVICE_NAME` fallback `platform`)                                                                                                                  | 2026-07-11 foundation slice | ⏳ pending |
| e2e harness: generic steps `a unique email saved as "<var>"` and `"<actor>" uses "<token>" as their bearer token` (drive registration/token-adoption scenarios with no product step code)               | 2026-07-11 foundation slice | ⏳ pending |
| `new-service` skill: reference-service wording made repo-relative (upstream keeps `example-service`)                                                                                                    | 2026-07-11 foundation slice | ⏳ pending |
