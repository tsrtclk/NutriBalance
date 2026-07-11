---
name: offline-first-mobile
description:
  Build mobile features that keep working with no/poor connectivity — network
  classification, a persisted priority sync queue with idempotent replay and
  conflict resolution, and offline-safe background senders (telemetry, uploads).
  Use when a feature does writes that must survive being offline, when adding to
  the sync queue, or when a queued action double-applies or is lost. Triggers on
  "offline", "sync queue", "poor connectivity", "2G", "retry", "idempotency
  key", "conflict resolution", "background flush", "queue and replay".
---

# Offline-first mobile

When the network is unreliable, a write must not be lost and must not be applied
twice. The pattern: **persist the intent locally, replay it when connectivity
returns, and dedupe server-side.** Reads fall back to cache; writes go through a
queue.

## Network classification

Classify connectivity into tiers (offline / slow-2G / 3G / 4G / wifi) from a
connectivity plugin and expose it as an observable the whole app can watch.
Behavior scales with the tier: offline → cache-only + enqueue writes; slow tiers
→ text-only, skip images; fast tiers → full payloads + background sync. Don't
treat "has a network interface" as "online" — a 2G bar is not a 4G bar.

## The persisted queue (load-bearing)

Every offline-capable write becomes a **queued op** in local storage (encrypt
the box if the payload is sensitive):

- **Client-generated id** on each op (`client_op_id`, a UUID) — the server
  **dedupes on it**, so a replay after a lost response is safe. This is the
  single most important field; without it, retries double-apply.
- **Priority** so the queue drains what matters first (CRITICAL emergencies/
  payments before LOW analytics/images).
- **`expires_at`** so stale ops don't replay forever.
- **`conflict_resolution`** strategy per op (see below).
- Drains on a connectivity-returned signal; CRITICAL first, then oldest.

Persist ops so they survive app restarts. Bound the queue and drop expired ops.

## The replay endpoint (server side)

`POST /sync/batch` takes a device's queued ops and returns a **per-op result**
so the client can settle each one independently. Keep the engine **generic and
domain-agnostic** — it owns idempotency, versioning and dispatch; per-entity
**handlers** own the actual write:

1. **Idempotency** — look up `client_op_id`; if a terminal attempt exists,
   return its recorded outcome (a prior `synced` reads back as `duplicate`) and
   **don't** re-run the handler.
2. **Record intent** — upsert the op row before dispatch (audit + dedupe).
3. **Dispatch** — call the handler for `operation_type`. A handler throws a
   typed `ConflictError` for a lost race, anything else for a **permanent**
   failure. This keeps the engine free of domain error types.
4. **Version** — bump the entity's version counter on success.
5. **Settle** — persist the terminal status; return
   `{ client_op_id, status, entity_id?, version?, error? }` where status ∈
   `synced|duplicate|conflict|failed`.

Client settlement: `synced`/`duplicate`/`conflict` → drop the local op (on
conflict the UI refetches server state); `failed` → retry a few times then drop.
Take the acting user from the **JWT**, never the op payload.

## Conflict resolution

The server replays each op under optimistic concurrency against a version column
and returns a per-op result. Pick a strategy per entity: `last-write-wins` for
user-owned data, `server-wins` for authoritative state machines (booking
status), `server-authoritative` for money, `manual-merge` where human judgment
is needed. Never silently overwrite money or a state machine with a stale
offline value. **Only queue writes that are safe to replay** — money movements
that need an online provider don't belong in the offline queue.

## Design the engine to be unit-testable

Type the engine's DB dependency **structurally** (just the delegates it calls),
not as the concrete ORM client, so it's trivial to pass an in-memory fake in a
unit test. Then the idempotency / conflict / failure branches are covered
without a database, and the ORM path and the fake path can't diverge.

## Offline-safe background senders

The same discipline covers fire-and-forget senders (telemetry, image uploads,
non-critical logs), which are just a LOW-priority variant:

- **Best-effort, never blocks or throws into the UI.** A failed flush leaves the
  batch queued for the next attempt.
- **Batch** to amortize round-trips; delete a batch only after the POST
  succeeds.
- **Cap** the local buffer (drop oldest past a limit) so a long offline stretch
  can't exhaust storage.
- **Idempotent** on a client id so a re-flush doesn't double-count.

(See the `product-telemetry` skill for the telemetry instance of this pattern.)

## Gotchas

- **No idempotency key = double writes.** The retry path is the normal path on a
  flaky network; design for it first.
- **Draining re-entrancy.** Guard the drain so a second connectivity event
  doesn't start a concurrent drain over the same ops.
- **Encrypt only what needs it.** Sensitive queues (payments, session) get an
  encrypted box; non-PII buffers (telemetry) don't need the overhead.
- **A storage budget is real.** Map tiles + image cache dwarf everything; size
  each box and enforce caps.

## Where the pieces live in this skeleton

The generic server core ships here: `SyncEngine` + types in
`@platform/service-kit` (`packages/service-kit/src/sync/`), the
`OfflineQueue`/`EntityVersion` model shapes in the prisma-client shell, and the
engine's unit spec (in-memory fake) in
`services/example-service/test/sync.engine.spec.ts`. A product adds a
`POST /sync/batch` controller in the service that owns the replayed entities,
registers one handler per `operation_type`, and records its replay business
rules (per-entity conflict policy, TTL/retry/priority) as a decision record in
`docs/architecture/`. The client queue implementation stays in the product's
mobile app.
