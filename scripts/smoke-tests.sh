#!/bin/bash
# Smoke tests — gateway + services readiness/deploy gate
# Usage: ./scripts/smoke-tests.sh [local|staging|production]
#
# One representative endpoint per microservice, hit through the gateway.
# A check passes when the service answers with its expected status —
# 200 for public reads, 401 for guarded routes without a JWT, 400 for
# validation rejects. Kong's 404 ("no Route matched") or any 5xx/timeout
# fails the check, so this catches both broken routing and dead services.
#
# Bash 3.2 compatible (macOS /bin/bash) — no associative arrays.

set -euo pipefail

ENV="${1:-local}"

case "$ENV" in
  local)      BASE="http://localhost:8000" ;;
  # Point these at your product's gateway once it has one:
  staging)    BASE="${SMOKE_BASE_URL:?set SMOKE_BASE_URL for staging}" ;;
  production) BASE="${SMOKE_BASE_URL:?set SMOKE_BASE_URL for production}" ;;
  *) echo "Unknown env: $ENV"; exit 1 ;;
esac

echo "🧪 Running smoke tests against $ENV ($BASE)"
echo

PASS=0
FAIL=0

# service | method | path (under /api/v1) | expected status
# One line per service. A JWT-guarded route answers 401 without a token; a
# @Public POST with an empty {} body is rejected by validation (400) before
# any write — either way the check is side-effect-free in every environment.
CHECKS=(
  "auth|POST|auth/login|400"
  "profile|GET|profile|401"
  "profile|GET|weight-entries|401"
  "nutrition|GET|foods/search|401"
  "nutrition|GET|journal|401"
  "nutrition|GET|hydration|401"
  "nutrition|GET|supplements|401"
  "workout|GET|exercises|401"
  "workout|GET|workouts|401"
  "notification|GET|notifications|401"
  "notification|GET|notification-preferences|401"
  "coach|GET|coach/chat|401"
  "profile|GET|settings|401"
  "gamification|GET|gamification/streaks|401"
)

for entry in "${CHECKS[@]}"; do
  svc="${entry%%|*}"; rest="${entry#*|}"
  method="${rest%%|*}"; rest="${rest#*|}"
  path="${rest%%|*}"; expected="${rest#*|}"

  if [ "$method" = "POST" ]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
      -X POST -H 'Content-Type: application/json' -d '{}' \
      "${BASE}/api/v1/${path}")" || code="000"
  else
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
      "${BASE}/api/v1/${path}")" || code="000"
  fi

  if [ "$code" = "$expected" ]; then
    echo "  ✓ ${svc}: ${method} /api/v1/${path} → ${code}"
    PASS=$((PASS + 1))
  else
    echo "  ✗ ${svc}: ${method} /api/v1/${path} → ${code} (expected ${expected})"
    FAIL=$((FAIL + 1))
  fi
done

echo
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
