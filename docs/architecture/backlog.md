# Backlog & Open Decisions

> **This file is the project's memory of deferred work and undefined rules.**
> Maintaining it is part of Definition of Done for **every** PR — see the
> "Backlog discipline" section in `AGENTS.md`. Every item has a **stable ID**
> (`D#` decision, `B#` feature, `X#` cross-cutting). Reference IDs from code
> (`// backlog: D1`), commit bodies, and PRs so code ↔ backlog stay linked.

**Last updated:** 2026-07-11 (foundation slice: domain schema + auth-service
(É2) + profile-service (É1 + É7 weight curve)).

---

## 0. Working protocol

On **every** feature/fix slice:

- **A. Open** — read §2–§5; note what your slice **depends on** (keep its safe
  default) or **unblocks**.
- **B. Build** — every default / `TODO` / stub / hack / skipped-rule gets a
  backlog item, with its ID in the code comment (`// backlog: D1 — …`).
- **C. Close (before merge)** — sweep §5: tick what your slice unblocked (move to
  §6), add new items, fix Blocked-by/Unblocks links, bump "Last updated", add a
  §7 changelog line.

> Improve the protocol when you hit a gap. If a default keeps biting, promote it
> from a code comment to a §2 decision.

---

## 1. Status snapshot

MVP tiers from `docs/product/backlog.md` (épics keep their É# numbering there).

| Tier    | Épics                                                            | State                                               |
| ------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| MVP     | É2 authentification                                              | ✅ done & wired (register/login/refresh/logout)     |
| MVP     | É1 profil/onboarding                                             | 🟢 API done (targets computed; D1 sign-off pending) |
| MVP     | É7 progrès                                                       | 🟠 weight curve done; photos/mesures → B4           |
| MVP     | É3 alimentaire · É6 sportif                                      | ⬜ not started (B2, B3)                             |
| Confort | É4 hydratation · É5 compléments · É9 notifications               | ⬜ not started (water _target_ ships in É1 targets) |
| Diff.   | É8 IA coach · É10 gamification · É11 intégrations · É12 réglages | ⬜ not started                                      |

---

## 2. Open decisions (undefined rules)

Code uses a safe default + a `// backlog: D#` comment. Each needs a product call.

| ID  | Decision needed                                                                                                                                                                                                                                   | Safe default in code                                                                                              | Where                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| D1  | **Target-formula constants** (É1): default/max weekly rates (loss 0.75/1.0 %BW, gain 0.25/0.5 %BW), macro split (protein g/kg per goal, fat 25% kcal), recomp −10% TDEE, 1200 kcal floor, water 35 ml/kg + activity bump. Needs product sign-off. | Named constants, pure fn returns a breakdown so the UI can explain itself                                         | `profile-service/src/modules/profile/compute-targets.ts` |
| D2  | **Session policy**: access 15 min / refresh 30 d, single session per (user, device), refresh reuse kills the device session. Confirm lifetimes + whether parallel sessions per device are needed.                                                 | Env-tunable TTLs (`JWT_ACCESS_TTL_SEC`, `JWT_REFRESH_TTL_SEC`); rotation enforced via Redis `rt:{sub}:{deviceId}` | `auth-service/src/modules/auth/auth.service.ts`          |

---

## 3. Feature backlog

"Blocked by" → the decisions/services/X-items that must exist first.

| ID  | Feature                                                                                              | Épic | Blocked by |
| --- | ---------------------------------------------------------------------------------------------------- | ---- | ---------- |
| B1  | Auth brute-force protection: per-account lockout / progressive delay (only a coarse IP throttle now) | É2   | —          |
| B2  | Food journal service: OpenFoodFacts search, barcode, manual foods, meals, daily totals vs targets    | É3   | —          |
| B3  | Workout service: exercise library, splits, sessions (sets×reps×load), rest timer, progression        | É6   | —          |
| B4  | Progress extras: photos, body measurements, objective-vs-réel comparison                             | É7   | —          |
| B5  | Hydration logging (targets already served by `GET /profile/targets` → `water_ml`)                    | É4   | —          |
| B6  | Supplements: list, dosage/schedule, intake history                                                   | É5   | —          |
| B7  | Notifications service (meal/hydration/supplement/workout reminders)                                  | É9   | B2, B5, B6 |
| B8  | AI coach on the Claude API (daily advice, plateau detection, chat, weekly report)                    | É8   | B2, B3     |
| B9  | Gamification: streaks, badges, weekly challenges                                                     | É10  | B2, B3     |
| B10 | Integrations: Apple Health / Google Fit, PDF/CSV export, Stripe                                      | É11  | —          |
| B11 | Settings: units (kg/lb), per-type notification toggles, RGPD account/data deletion                   | É12  | —          |
| B12 | Flutter app shell under `mobile/` + first authenticated journey                                      | —    | —          |
| B13 | Password reset / email verification flow (register/login ship without either)                        | É2   | —          |

---

## 4. Cross-cutting TODOs (touch many services)

| ID  | Rule / TODO                                                                                                                                                                                              | State                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| X1  | **Shared Redis key prefix.** The kit's JWT strategy reads the `bl:access:*` blacklist through `redis.keyPrefix`, so every service MUST use the same prefix (`nb:`). Namespace per-feature keys yourself. | Rule set; enforced by convention (configs + compose). Consider a CI check. |
| X2  | Health `/ready` endpoints return static OK — add DB/Redis/RabbitMQ readiness indicators                                                                                                                  | Open (both services)                                                       |

---

## 5. Dependency ledger

Forward map: when a blocker lands, what to unblock.

| Blocker (resolve →)       | Unblocks                                                        |
| ------------------------- | --------------------------------------------------------------- |
| D1 product sign-off       | Final target numbers surfaced in the mobile UI without caveats  |
| B2 food journal · B5 · B6 | B7 notifications content, B8 coach inputs, B9 streak sources    |
| B12 mobile shell          | `flutter-integration-testing` journeys, `mobile-ux-review` work |

---

## 6. Resolved log

Move items here when ticked (date · ID · what landed · PR).

- 2026-07-11 · (bootstrap item) "replace the example `Place` domain" → NutriBalance schema (users/profiles/weight_entries) landed with the foundation slice.
- 2026-07-11 · (bootstrap item) "wire the auth service (É2)" → `services/auth-service` issues/rotates/revokes JWTs; e2e login helper implemented; CI e2e job enabled.

---

## 7. Changelog (per slice)

- **2026-07-11 · foundation slice** — replaced the example domain with the
  NutriBalance schema (User+credentials, Profile, WeightEntry) + initial
  migration; built `auth-service` (É2: register/login/refresh-rotation/logout,
  bcrypt, Redis blacklist) and `profile-service` (É1: profile upsert +
  `GET /profile/targets` via pure `computeTargets` w/ unit tests; É7: weight
  entries + curve); removed `example-service` (reference shape is now
  `profile-service`); made kit `UserPayload` product-neutral (email); Kong/
  compose/smoke wiring; e2e suite live (auth/profile/weight features) + CI e2e
  job enabled. Seeded D1-D2, B1-B13, X1-X2. Next: B2 (É3 food journal), B3
  (É6 workouts), B12 (mobile shell).
- **2026-07-11 · bootstrap** — repo initiated from `platform-skeleton`
  (incl. the fresh koydas sync: SyncEngine, 7 new generic skills,
  accessibility checklists, upstream-sync ledger). Imported the product
  backlog to `docs/product/backlog.md`; seeded §1 with the épic tiers.
  Next slices: replace the example `Place` domain, wire the auth service
  (É2), start É1/É3.
