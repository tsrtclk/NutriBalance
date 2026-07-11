---
name: docker-compose-microservices
description:
  Run, rebuild and test a microservice stack under docker-compose behind an API
  gateway. Use when a service change must run against the live local stack or
  e2e, or when routes 404 after a rebuild.
---

# docker-compose microservices (run + test loop)

A typical stack: N services behind an API gateway (Kong/Traefik/nginx), plus
datastores (Postgres, Redis, a broker, object store). Services often resolve
shared workspace packages via a runtime path/alias config.

## Rebuild → verify loop (every backend change)

```bash
docker compose up -d --build <service>   # rebuild only what changed
docker compose restart <gateway>         # if the gateway caches DNS — see below
docker logs <container> --tail 5          # confirm it started cleanly
# then run the API e2e suite against the live stack
```

## Gotchas (load-bearing)

- **Gateway DNS cache:** a DB-less gateway (e.g. Kong DB-less, declarative
  config) resolves upstream hostnames once and caches the IP. Recreating a
  service container gives it a **new IP**, so the gateway keeps routing to the
  old one and returns 404 until you **restart the gateway**. Do this after
  rebuilding any service the tests hit.
- **Disk pressure wedges the daemon:** large multi-service rebuilds fill the
  Docker VM disk (`Docker.raw` on macOS) and break BuildKit
  (`input/output error`); docker commands then **hang**, and pruning while
  wedged hangs too. Recover in order: quit the app → `pkill -9 -f com.docker` (a
  soft pkill is often not enough; a surviving stale backend causes the
  "Docker.app is not open anymore" / error -600 on relaunch — kill again) →
  relaunch → wait for `docker info` → `docker builder prune -af` +
  `docker image prune -af` (build cache is the usual tens-of-GB culprit;
  `Docker.raw` won't shrink, internal free space is what matters). After a
  daemon restart, `compose up -d` to revive dead services + restart the gateway.
  Keep a project runbook for this (e.g.
  `docs/runbooks/docker-local-testing.md`).
- **`pg_isready` without `-h` lies during first boot:** the postgres entrypoint
  runs a **temporary** initdb server that answers on the unix socket before the
  real server listens on TCP, so a socket-based `pg_isready` (via `docker exec`
  / compose healthcheck) reports ready while clients still get connection
  refused. Always pass `-h 127.0.0.1` in wait loops and healthchecks so
  readiness means TCP-reachable.
- **Dev-only config is dev-only:** gateway config mounted by compose, and env
  flags that relax limits or expose test affordances, must never be assumed to
  ship to prod (which is usually a different orchestration, e.g. k8s). Gate such
  flags by env and default them off.
- **Host networking from devices:** the iOS simulator reaches the host at
  `localhost`; the Android emulator at `10.0.2.2`.

## Testing layers

- **Unit** (per service): typecheck + lint + unit tests, scoped to the changed
  package (e.g. `turbo run typecheck lint test --filter=<svc>`).
- **API e2e:** a suite that drives the live stack through the gateway. Keep step
  definitions **generic and reusable** (a new feature is usually just new data,
  not new steps). **Don't assert on positional array indexes** — match items by
  a key so reordering doesn't break the test.
- **UI e2e:** drive the real app against this same stack (see the
  `flutter-integration-testing` skill).

Run the **full local gate before pushing** (lint + format + typecheck + unit +
e2e, plus the app's analyze/test) so local == CI.
