# Docker for local microservice testing — runbook

> Generic playbook for running a docker-compose microservice stack on a dev
> machine (Docker Desktop/macOS wording; the failure modes are universal).
> Companion to the `docker-compose-microservices` skill.

## Daily loop

```bash
npm run infra:up                          # bring the stack up (compose up -d)
docker compose ps                         # everything should be Up/healthy
docker compose up -d --build <service>    # rebuild ONLY what changed
docker compose restart kong               # ALWAYS after rebuilding a routed service (DNS cache)
docker logs <container> --tail 5          # confirm clean start
npm run test:e2e                          # verify against the live stack
```

## Failure modes & fixes

### 1. Disk full → daemon wedged (the big one)

**Symptoms:** builds fail with BuildKit `input/output error`; `docker` commands
hang (>10 s with no output); Docker Desktop UI frozen; host disk fine but the
Docker VM disk
(`~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw`) at its
cap.

**Fix — in this order:**

```bash
# 1. quit the app (may silently fail when wedged)
osascript -e 'quit app "Docker"'
# 2. kill stale backends — a soft pkill often ISN'T enough:
pkill -9 -f "com.docker"
#    (com.docker.vmnetd surviving is fine — it's a persistent launchd helper)
# 3. relaunch; if you get “application Docker.app is not open anymore” /
#    error -600, a stale backend is still holding the app: repeat step 2, retry
open -a Docker
# 4. wait for the daemon, then reclaim:
until docker info >/dev/null 2>&1; do sleep 5; done
docker builder prune -af      # build cache is the usual culprit (tens of GB)
docker image prune -af        # unused images; running containers keep theirs
docker system df              # verify
```

Notes:

- `docker system prune` **while the daemon is wedged just hangs** — restart the
  daemon first, prune after.
- `Docker.raw` does **not** shrink after pruning; internal free space is what
  matters. To shrink the file itself, lower the VM disk size in Docker Desktop
  settings (destroys the VM contents) — rarely worth it.
- **Prevention:** prune the builder cache after big multi-service rebuild
  sessions; it grows ~GBs per full rebuild round.

### 2. Gateway 404s after a rebuild (DB-less gateway DNS cache)

Recreating a service container gives it a new IP; a DB-less gateway (Kong
declarative, etc.) cached the old one. **`docker compose restart kong`** after
rebuilding any routed service. (Full detail: `docker-compose-microservices`
skill.)

### 3. Stack partially down after a daemon restart

`docker system df` showing e.g. `Containers 18, ACTIVE 7` means most services
died with the daemon. `docker compose up -d` from the compose dir restores
everything (healthchecks gate the dependents); then the gateway restart if
services got new IPs.

### 4. Dev-only affordances (never prod)

Compose-only env flags (relaxed rate limits, `AUTH_DEV_OTP_ECHO` for tests) and
the mounted gateway config are for local testing. Prod is a different
orchestration (k8s) and must not inherit them.

## Reachability cheatsheet

| From                 | Gateway URL                 |
| -------------------- | --------------------------- |
| host / iOS simulator | `http://localhost:8000`     |
| Android emulator     | `http://10.0.2.2:8000`      |
| physical device      | `http://<host-LAN-IP>:8000` |
