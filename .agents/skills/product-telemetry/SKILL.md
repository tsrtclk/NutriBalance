---
name: product-telemetry
description:
  Capture product-usage telemetry (sessions, screen views, funnel steps) from a
  mobile/web client and turn it into adoption metrics (MAU/DAU, most-used
  screens, funnel drop-off). Use when the spec asks for usage/adoption/retention
  metrics but only domain events are captured, or when you need to find where a
  multi-step journey leaks users. Triggers on "MAU", "DAU", "adoption",
  "activation funnel", "drop-off", "usage analytics", "who's active",
  "engagement", "product metrics".
---

# Product telemetry & adoption analytics

**Domain events are not product telemetry.** A domain-event store
(`order.placed`, `alert.created`) proves _what happened in the business_; it
cannot tell you _how people use the app_ — who is active, which screens get
used, and where a multi-step journey loses people. Those need a separate
client-originated signal. If a spec lists MAU/DAU/adoption/retention and you
only have domain events, this is the gap.

## The four moving parts

1. **A tiny, closed event vocabulary.** Keep it small so ingest stays cheap and
   the data stays analyzable: `session_start`, `session_end`, `screen_view`,
   `action`. Each event carries a client-generated `event_id` (idempotency), a
   `session_id`, an ISO `occurred_at`, a `name` (screen or action key), and
   optional non-PII `props`. **Never** put user text, IDs of other people, or
   secrets in telemetry.

2. **An offline-first client.** Telemetry must never block or crash the UI and
   must survive being offline:
   - Buffer events to local storage (a queue), flush in **batches** to the
     backend, delete a batch only on a successful POST, keep it on error.
   - Cap the queue (drop oldest past a limit) so it can't grow unbounded.
   - Attribute events to the logged-in user **server-side, from the auth token**
     — never trust a client-supplied user id.
   - Gate on **consent** (opt-out switch); clear the queue immediately on
     opt-out.
   - Auto-capture `screen_view` from the router (see below); expose a
     `logAction(name)` for funnel steps a screen can't express as navigation.

3. **A batch ingest endpoint.** `POST /telemetry` (authenticated) takes an array
   of events, **dedupes on `event_id`** (upsert), and persists. Bound the batch
   size. Make it idempotent so a client re-flush is safe. Fall back to an
   in-memory buffer if the store is down so ingest never hard-fails.

4. **A pure, unit-tested aggregator.** Fetch a bounded recent record set and run
   a side-effect-free function so the persisted path and the fallback path
   produce identical numbers. Compute:
   - **Active users**: distinct users in rolling 1/7/30-day windows → DAU / WAU
     / MAU.
   - **Top screens**: views + distinct users per `screen_view` name.
   - **Funnels**: for each ordered list of step names, distinct users who
     reached each step, **drop-off vs the previous step**, and overall
     conversion. This is the adoption-bottleneck view.

## Screen tracking without brittle observers

Auto-capturing screen views via a raw navigator observer is fragile (routes are
often unnamed). Instead read the **current location off the router's route-
information/state listenable** and derive a stable screen name from the path:
strip the leading slash, join segments with `_`, and **drop id-looking
segments** so `/tools/<uuid>/edit` → `tools_edit` (not one screen per id).
Funnel step names are just these derived screen names, so most funnels need no
manual instrumentation.

## Gotchas (load-bearing)

- **Adoption windows compare to "now".** Tests and fixtures must use timestamps
  near the current time, or MAU/DAU will read zero. Don't hardcode a fixed past
  date in an ingest test.
- **Idempotency or you'll double-count.** A flush that succeeds server-side but
  whose response is lost will be retried — dedupe on `event_id`.
- **Aggregate metrics are sensitive.** Whole-population adoption numbers should
  be restricted to an admin/ops role once RBAC exists; guard the read endpoint.
- **Keep it non-PII.** Screen names and action keys only. This keeps the data
  shareable and the privacy surface small.

## Product specifics

Keep project-specific wiring (service names, funnel definitions, storage keys)
out of this file — put it in a `references/<product>.md` next to this skill in
the product repo, so the generic pattern stays portable.
