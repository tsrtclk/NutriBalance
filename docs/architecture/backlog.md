# Backlog & Open Decisions

> **This file is the project's memory of deferred work and undefined rules.**
> Maintaining it is part of Definition of Done for **every** PR — see the
> "Backlog discipline" section in `AGENTS.md`. Every item has a **stable ID**
> (`D#` decision, `B#` feature, `X#` cross-cutting). Reference IDs from code
> (`// backlog: D1`), commit bodies, and PRs so code ↔ backlog stay linked.

**Last updated:** 2026-07-12 (É4+É5 slice: hydration + supplements modules in
nutrition-service).

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

| Tier    | Épics                                                            | State                                                                                                             |
| ------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| MVP     | É2 authentification                                              | ✅ done & wired (register/login/refresh/logout)                                                                   |
| MVP     | É1 profil/onboarding                                             | 🟢 API done (targets computed; D1 sign-off pending)                                                               |
| MVP     | É7 progrès                                                       | 🟠 weight curve done; photos/mesures → B4                                                                         |
| MVP     | É3 alimentaire                                                   | 🟢 API done (search/barcode/custom/journal/favoris; recettes+photo → B14)                                         |
| MVP     | É6 sportif                                                       | 🟢 API done (library/séances/RPE/kcal/progression/suggestion; timer repos = mobile UI, routines pré-faites → B16) |
| Confort | É4 hydratation · É5 compléments                                  | 🟢 API done (quick-add + day totals; liste/dosage/horaires + historique prise; rappels → É9)                      |
| Confort | É9 notifications                                                 | ⬜ not started (B7 — now unblocked: B2 ✅ B5 ✅ B6 ✅)                                                            |
| Diff.   | É8 IA coach · É10 gamification · É11 intégrations · É12 réglages | ⬜ not started                                                                                                    |

---

## 2. Open decisions (undefined rules)

Code uses a safe default + a `// backlog: D#` comment. Each needs a product call.

| ID  | Decision needed                                                                                                                                                                                                                                                           | Safe default in code                                                                                              | Where                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| D1  | **Target-formula constants** (É1): default/max weekly rates (loss 0.75/1.0 %BW, gain 0.25/0.5 %BW), macro split (protein g/kg per goal, fat 25% kcal), recomp −10% TDEE, 1200 kcal floor, water 35 ml/kg + activity bump. Needs product sign-off.                         | Named constants, pure fn returns a breakdown so the UI can explain itself                                         | `profile-service/src/modules/profile/compute-targets.ts`           |
| D2  | **Session policy**: access 15 min / refresh 30 d, single session per (user, device), refresh reuse kills the device session. Confirm lifetimes + whether parallel sessions per device are needed.                                                                         | Env-tunable TTLs (`JWT_ACCESS_TTL_SEC`, `JWT_REFRESH_TTL_SEC`); rotation enforced via Redis `rt:{sub}:{deviceId}` | `auth-service/src/modules/auth/auth.service.ts`                    |
| D3  | **Food data provider** (É3): OpenFoodFacts impl exists but the deterministic mock is bound outside production (`FOOD_PROVIDER`). Before flipping the prod default: contract-test the OFF mapping against the live API + decide a cache-refresh policy for stale OFF rows. | Swappable port `FOOD_DATA_PROVIDER`; mock in dev/CI so tests run offline with stable numbers                      | `nutrition-service/src/modules/foods/provider/`                    |
| D4  | **Calories-burned estimate** (É6): MET bands per RPE (3.5 / 5.0 / 6.0), the MET formula, the 75 kg no-profile fallback and the 1-300 min duration clamp need product sign-off.                                                                                            | Pure `computeWorkoutCalories`, named constants                                                                    | `workout-service/src/modules/workouts/compute-workout-calories.ts` |
| D5  | **Next-session heuristics** (É6): 48h recovery window, PPL / upper-lower rotation, beginner→full-body rule. Likely superseded by the É8 AI coach.                                                                                                                         | Pure `suggestNextSession` returning focus + avoid-list + reason                                                   | `workout-service/src/modules/workouts/suggest-next-session.ts`     |

---

## 3. Feature backlog

"Blocked by" → the decisions/services/X-items that must exist first.

| ID  | Feature                                                                                                                                                                                            | Épic | Blocked by |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------- |
| B1  | Auth brute-force protection: per-account lockout / progressive delay (only a coarse IP throttle now)                                                                                               | É2   | —          |
| B2  | ~~Food journal service~~ → done (see §6); remaining É3 extras tracked as B14                                                                                                                       | É3   | —          |
| B3  | ~~Workout service~~ → done (see §6); remaining É6 extras tracked as B16                                                                                                                            | É6   | —          |
| B4  | Progress extras: photos, body measurements, objective-vs-réel comparison                                                                                                                           | É7   | —          |
| B5  | ~~Hydration logging~~ → done (see §6)                                                                                                                                                              | É4   | —          |
| B6  | ~~Supplements~~ → done (see §6)                                                                                                                                                                    | É5   | —          |
| B7  | Notifications service (meal/hydration/supplement/workout reminders) — inputs all live now                                                                                                          | É9   | B2, B5, B6 |
| B8  | AI coach on the Claude API (daily advice, plateau detection, chat, weekly report)                                                                                                                  | É8   | B2, B3     |
| B9  | Gamification: streaks, badges, weekly challenges                                                                                                                                                   | É10  | B2, B3     |
| B10 | Integrations: Apple Health / Google Fit, PDF/CSV export, Stripe                                                                                                                                    | É11  | —          |
| B11 | Settings: units (kg/lb), per-type notification toggles, RGPD account/data deletion                                                                                                                 | É12  | —          |
| B12 | Flutter app shell under `mobile/` + first authenticated journey (needs a Flutter-toolchain session: no dart/flutter in the current env, and the UI-test discipline forbids shipping it unverified) | —    | —          |
| B13 | Password reset / email verification flow (register/login ship without either)                                                                                                                      | É2   | —          |
| B14 | É3 extras: recettes maison (macro auto-calc), repas types réutilisables, photo-estimation (phase 2)                                                                                                | É3   | —          |
| B15 | Daily totals **vs targets** in one response (journal totals live in nutrition-service, targets in profile-service — needs a BFF/aggregate call or client-side merge decision)                      | É3   | —          |
| B16 | É6 extras: routines pré-faites (Full Body / Haut-Bas / PPL templates avec rotation auto), GIF/vidéo média library, rest-timer config                                                               | É6   | —          |

---

## 4. Cross-cutting TODOs (touch many services)

| ID  | Rule / TODO                                                                                                                                                                                                                                                | State                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| X1  | **Shared Redis key prefix.** The kit's JWT strategy reads the `bl:access:*` blacklist through `redis.keyPrefix`, so every service MUST use the same prefix (`nb:`). Namespace per-feature keys yourself.                                                   | Rule set; enforced by convention (configs + compose). Consider a CI check. |
| X2  | Health `/ready` endpoints return static OK — add DB/Redis/RabbitMQ readiness indicators                                                                                                                                                                    | Open (all services)                                                        |
| X3  | **Data ownership across services**: workout-service reads the `profiles` table directly (weight for kcal estimate, training level for suggestions). Fine on the shared DB; define the rule (or switch to events/API) before services get their own stores. | Open (one read site, tagged in code)                                       |

---

## 5. Dependency ledger

Forward map: when a blocker lands, what to unblock.

| Blocker (resolve →)  | Unblocks                                                        |
| -------------------- | --------------------------------------------------------------- |
| D1 product sign-off  | Final target numbers surfaced in the mobile UI without caveats  |
| D3 OFF contract test | Flipping `FOOD_PROVIDER` default to openfoodfacts in prod       |
| —                    | B7 notifications fully unblocked (B2 ✅ B5 ✅ B6 ✅)            |
| —                    | B8 AI coach fully unblocked (journal ✅ + workouts ✅)          |
| D5 supersession      | É8 coach replaces the heuristic suggestion (keep the endpoint)  |
| B12 mobile shell     | `flutter-integration-testing` journeys, `mobile-ux-review` work |

---

## 6. Resolved log

Move items here when ticked (date · ID · what landed · PR).

- 2026-07-12 · B5+B6 · hydration + supplements modules landed in nutrition-service: quick-add water w/ day totals, supplement list (dosage + horaires) w/ intake history + deactivation.
- 2026-07-12 · B3 · workout-service landed: seeded exercise library (20 moves, filter by muscle/equipment) + custom exercises, sessions (sets×reps×poids×repos), RPE completion with MET kcal estimate, per-exercise progression curve, next-session suggestion.
- 2026-07-11 · B2 · nutrition-service landed: OFF/mock provider port, food search/barcode/custom, favorites/recents, journal with snapshot macros + day totals.
- 2026-07-11 · (bootstrap item) "replace the example `Place` domain" → NutriBalance schema (users/profiles/weight_entries) landed with the foundation slice.
- 2026-07-11 · (bootstrap item) "wire the auth service (É2)" → `services/auth-service` issues/rotates/revokes JWTs; e2e login helper implemented; CI e2e job enabled.

---

## 7. Changelog (per slice)

- **2026-07-12 · É4+É5 slice** — `HydrationEntry`/`Supplement`/
  `SupplementIntake` models + migration; nutrition-service gains `hydration`
  (quick-add ml, UTC day view + total — the target stays in
  `GET /profile/targets`, B15) and `supplements` (list w/ dosage +
  "HH:MM" horaires, intake log + history, deactivation keeps history and
  409s new intakes) modules; events `hydration.logged`/`supplement.taken`
  (B7/B9 feeds); Kong paths + smoke checks; hydration/supplements e2e
  (5 scenarios); 6 new unit tests. B5+B6 resolved → B7 fully unblocked.
  B12 (Flutter shell) noted as blocked on a Flutter-toolchain environment.
  Next: B7 (É9 notifications) or B4 (É7 extras); B12 when tooling exists.
- **2026-07-12 · É6 slice** — `workout-service`: `Exercise`/`Workout`/
  `WorkoutSet` models + migration with a 20-exercise seeded library
  (none/home/gym equipment tiers); exercises list/filter + private custom
  exercises; sessions: start → add sets (séries×reps×poids×repos, volume
  aggregate) → complete with RPE → MET-based kcal estimate (pure fn, D4)
  using profile weight (X3 cross-table read); per-exercise progression
  endpoint (top weight + volume per day); next-session suggestion (pure fn,
  D5: 48h recovery avoid-list + PPL/upper-lower rotation, beginner→full
  body); event `workout.completed`; Kong/compose/smoke wiring;
  `workout.feature` e2e (4 scenarios). B3 resolved; D4, D5, X3, B16 opened.
  Next: B12 (mobile shell), B5 (hydratation), B4 (É7 extras).
- **2026-07-11 · É3 slice** — `nutrition-service`: `FoodItem`/`JournalEntry`/
  `FavoriteFood` models + migration; swappable `FOOD_DATA_PROVIDER` port
  (deterministic mock for dev/CI, OpenFoodFacts impl for prod — D3); food
  search (local + provider, cached by barcode), barcode lookup, custom foods,
  favorites, recents; journal with write-time macro snapshots, per-meal day
  view + totals; events `food.created`/`journal.entry_logged`; Kong/compose/
  smoke wiring; `nutrition.feature` e2e (4 scenarios). B2 resolved; added
  B14 (recettes/repas types/photo), B15 (totals-vs-targets aggregation).
  Next: B3 (É6 workouts), B12 (mobile shell).
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
