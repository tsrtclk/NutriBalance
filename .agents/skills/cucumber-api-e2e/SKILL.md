---
name: cucumber-api-e2e
description:
  Build and run a Cucumber/Gherkin API end-to-end suite that drives a live stack
  through the gateway, with a generic reusable step vocabulary. Use when adding
  API e2e coverage or a new `.feature`. Project-agnostic.
---

# Cucumber API e2e (live stack through the gateway)

A reusable approach for API-level e2e: Gherkin `.feature` files exercise the
**running** backend through its gateway, guarding against cross-service
regressions. Adding a feature should usually be **just a new `.feature` file**,
not new step code.

## Keep steps generic + reusable

A small vocabulary covers most needs — invest here once:

- `Given a logged-in user "<actor>"` (mint a unique user per scenario for
  isolation; see real-login below)
- `When "<actor>" sends GET|POST|PATCH "<path>" [with body: """…"""]`
- `Then the response status should be <n>` /
  `the response field "<path>" should equal "<v>"` / list + nested-array
  assertions
- `remember the response field "<path>" as "<var>"` → interpolate `{{var}}`
- a **polling** step for async/eventual state (events through a broker):
  `polls GET "<path>" until …`

**Don't assert on positional array indexes** — match an item by a key
(`field "<arr>" should contain an item where "<k>" equals "<v>"`) so reordering
doesn't break the test.

## Real login in tests

If auth is OTP/magic-link, the suite needs the code. Two patterns:

- **Scrape** the dev-mode log line from the auth service (host-side runner), or
- **Dev endpoint:** an env-gated `GET /auth/dev/otp` that returns the current
  code (gate it so it's never on in prod).

Mint a **unique identifier per scenario** so users are isolated and scenarios
can run in parallel. If the auth service rate-limits, relax the limit via env in
the test stack only (prod keeps strict defaults) and back off on `429` as a
safety net.

## Run

```bash
# stack up first
npm run test:e2e                       # parallel
npm run test:e2e -- --profile serial   # one at a time, for debugging
```

After rebuilding a service the suite hits, restart a **DB-less gateway** (it
caches upstream DNS) — see `docker-compose-microservices`.

## Discipline

Every shipped feature gets a `.feature` scenario. The UI counterpart (driving
the app against the same stack) is the `flutter-integration-testing` skill.
