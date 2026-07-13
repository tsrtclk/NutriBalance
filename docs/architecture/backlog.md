# Backlog & Open Decisions

> **This file is the project's memory of deferred work and undefined rules.**
> Maintaining it is part of Definition of Done for **every** PR — see the
> "Backlog discipline" section in `AGENTS.md`. Every item has a **stable ID**
> (`D#` decision, `B#` feature, `X#` cross-cutting). Reference IDs from code
> (`// backlog: D1`), commit bodies, and PRs so code ↔ backlog stay linked.

**Last updated:** 2026-07-13 (B12 slice: Flutter app shell + first
authenticated journey).

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

| Tier    | Épics                           | State                                                                                                             |
| ------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| MVP     | É2 authentification             | ✅ done & wired (register/login/refresh/logout)                                                                   |
| MVP     | É1 profil/onboarding            | 🟢 API done (targets computed; D1 sign-off pending)                                                               |
| MVP     | É7 progrès                      | 🟠 weight curve done; photos/mesures → B4                                                                         |
| MVP     | É3 alimentaire                  | 🟢 API done (search/barcode/custom/journal/favoris; recettes+photo → B14)                                         |
| MVP     | É6 sportif                      | 🟢 API done (library/séances/RPE/kcal/progression/suggestion; timer repos = mobile UI, routines pré-faites → B16) |
| Confort | É4 hydratation · É5 compléments | 🟢 API done (quick-add + day totals; liste/dosage/horaires + historique prise; rappels → É9)                      |
| Confort | É9 notifications                | 🟢 API done (rappels repas/eau/compléments/séance + alerte objectif; vrai push → B17)                             |
| Diff.   | É8 IA coach                     | 🟢 API done (conseil du jour, chat, bilan hebdo, plateau; vrai LLM derrière D9)                                   |
| Diff.   | É10 gamification                | 🟢 API done (streaks/badges/défi hebdo, bus-driven; célébrations → inbox)                                         |
| Diff.   | É12 réglages                    | 🟢 API done (unités d'affichage, toggles par type, suppression compte RGPD)                                       |
| Diff.   | É11 intégrations                | ⬜ not started (B10)                                                                                              |
| Mobile  | Flutter app shell               | 🟢 shell + journey landed (login/register/onboarding/dashboard); more screens per épic → B21                      |

---

## 2. Open decisions (undefined rules)

Code uses a safe default + a `// backlog: D#` comment. Each needs a product call.

| ID  | Decision needed                                                                                                                                                                                                                                                                          | Safe default in code                                                                                              | Where                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| D1  | **Target-formula constants** (É1): default/max weekly rates (loss 0.75/1.0 %BW, gain 0.25/0.5 %BW), macro split (protein g/kg per goal, fat 25% kcal), recomp −10% TDEE, 1200 kcal floor, water 35 ml/kg + activity bump. Needs product sign-off.                                        | Named constants, pure fn returns a breakdown so the UI can explain itself                                         | `packages/domain/src/compute-targets.ts`                           |
| D2  | **Session policy**: access 15 min / refresh 30 d, single session per (user, device), refresh reuse kills the device session. Confirm lifetimes + whether parallel sessions per device are needed.                                                                                        | Env-tunable TTLs (`JWT_ACCESS_TTL_SEC`, `JWT_REFRESH_TTL_SEC`); rotation enforced via Redis `rt:{sub}:{deviceId}` | `auth-service/src/modules/auth/auth.service.ts`                    |
| D3  | **Food data provider** (É3): OpenFoodFacts impl exists but the deterministic mock is bound outside production (`FOOD_PROVIDER`). Before flipping the prod default: contract-test the OFF mapping against the live API + decide a cache-refresh policy for stale OFF rows.                | Swappable port `FOOD_DATA_PROVIDER`; mock in dev/CI so tests run offline with stable numbers                      | `nutrition-service/src/modules/foods/provider/`                    |
| D4  | **Calories-burned estimate** (É6): MET bands per RPE (3.5 / 5.0 / 6.0), the MET formula, the 75 kg no-profile fallback and the 1-300 min duration clamp need product sign-off.                                                                                                           | Pure `computeWorkoutCalories`, named constants                                                                    | `workout-service/src/modules/workouts/compute-workout-calories.ts` |
| D5  | **Next-session heuristics** (É6): 48h recovery window, PPL / upper-lower rotation, beginner→full-body rule. Likely superseded by the É8 AI coach.                                                                                                                                        | Pure `suggestNextSession` returning focus + avoid-list + reason                                                   | `workout-service/src/modules/workouts/suggest-next-session.ts`     |
| D6  | **Push channel** (É9): no vendor chosen (FCM/APNs need credentials + device-token registration, B17). The inbox is the source of truth; push is best-effort.                                                                                                                             | Swappable `PUSH_PROVIDER` port, mock bound in DI                                                                  | `notification-service/src/modules/notifications/push/`             |
| D7  | **Timezones** (É9): all "HH:MM" reminder times are interpreted in UTC; per-user timezone (profile field? device header?) undecided.                                                                                                                                                      | UTC everywhere; waking window 08:00-22:00 UTC                                                                     | `notification-service/src/modules/notifications/reminder-rules.ts` |
| D8  | **Plateau rule** (É8): 21-day window, ≥4 points over ≥14 days, <0.3% BW change, lose/gain goals only. Product may prefer EMA or different windows.                                                                                                                                       | Pure `detectPlateau`, named constants                                                                             | `coach-service/src/modules/coach/detect-plateau.ts`                |
| D9  | **Coach LLM** (É8): Claude `claude-opus-4-8` behind a swappable port; mock bound outside prod. Before enabling prod: finalize the French system prompt, cost ceilings (cache TTLs), and an eval set for advice quality.                                                                  | `COACH_LLM_PROVIDER` port; mock in dev/CI; best-effort fallback text on API errors                                | `coach-service/src/modules/coach/provider/`                        |
| D10 | **Streak semantics** (É10): UTC calendar days (aligned with D7); same-day repeats count events but don't grow the chain; a missed full day reads 0 on GET and resets on the next event; backfilled older days never rewind. A per-user timezone would move the day boundary.             | Pure `advanceStreak`/`effectiveCurrent`; day strings compare lexicographically                                    | `gamification-service/src/modules/gamification/streak-rules.ts`    |
| D11 | **Badge catalogue** (É10): first-action + streak milestones (3/7/30) per kind, French titles. Product may want different paliers or seasonal badges.                                                                                                                                     | Code-side catalogue; `badge_awards` stores only (user, code, when); awards monotonic + idempotent                 | `gamification-service/src/modules/gamification/badge-rules.ts`     |
| D12 | **Défi hebdo** (É10): deterministic rotation of a 4-entry catalogue by ISO week — same défi for everyone, zero scheduling. Product may want personalised or opt-in défis.                                                                                                                | Pure `challengeForWeek`; the def is frozen on the row at first write so a reshuffle never re-targets a live week  | `gamification-service/src/modules/gamification/challenge-rules.ts` |
| D13 | **Units** (É12): the API stays metric (kg/cm) on every payload; the stored preference only drives client rendering, with shared 1-decimal converters in @platform/domain. Server-side conversion was rejected (cache/consistency); confirm with the mobile app.                          | `user_settings` row (defaults kg/cm); pure `kgToLb`/`cmToIn` & co.                                                | `packages/domain/src/unit-conversions.ts`                          |
| D14 | **RGPD deletion** (É12): password re-confirmation then one cascade DELETE over users.id; audit_logs keep their rows with user_id nulled (confirm retention policy). Access tokens on _other_ devices stay verifiable ≤ 15 min (stateless verify) — accept or add a per-user kill switch. | `DELETE /auth/account`; blacklists the caller's device, publishes `user.deleted`                                  | `auth-service/src/modules/auth/auth.service.ts`                    |

---

## 3. Feature backlog

"Blocked by" → the decisions/services/X-items that must exist first.

| ID  | Feature                                                                                                                                                                                          | Épic | Blocked by |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ---------- |
| B1  | Auth brute-force protection: per-account lockout / progressive delay (only a coarse IP throttle now)                                                                                             | É2   | —          |
| B2  | ~~Food journal service~~ → done (see §6); remaining É3 extras tracked as B14                                                                                                                     | É3   | —          |
| B3  | ~~Workout service~~ → done (see §6); remaining É6 extras tracked as B16                                                                                                                          | É6   | —          |
| B4  | Progress extras: photos, body measurements, objective-vs-réel comparison                                                                                                                         | É7   | —          |
| B5  | ~~Hydration logging~~ → done (see §6)                                                                                                                                                            | É4   | —          |
| B6  | ~~Supplements~~ → done (see §6)                                                                                                                                                                  | É5   | —          |
| B7  | ~~Notifications service~~ → done (see §6); real push vendor tracked as B17                                                                                                                       | É9   | B2, B5, B6 |
| B8  | ~~AI coach~~ → done (see §6)                                                                                                                                                                     | É8   | B2, B3     |
| B9  | ~~Gamification~~ → done (see §6): streaks, badges, défis hebdo — all bus-driven                                                                                                                  | É10  | B2, B3     |
| B10 | Integrations: Apple Health / Google Fit, PDF/CSV export, Stripe                                                                                                                                  | É11  | —          |
| B11 | ~~Settings~~ → done (see §6): display units, per-type toggles (incl. gamification), RGPD deletion                                                                                                | É12  | —          |
| B12 | ~~Flutter app shell~~ → done (see §6): `mobile/` shell + register→onboarding→dashboard journey, envelope-aware API client with token refresh, widget + on-device tests, CI `mobile` job          | —    | —          |
| B13 | Password reset / email verification flow (register/login ship without either)                                                                                                                    | É2   | —          |
| B14 | É3 extras: recettes maison (macro auto-calc), repas types réutilisables, photo-estimation (phase 2)                                                                                              | É3   | —          |
| B15 | ~~Totals vs targets~~ → resolved by the `@platform/domain` extraction: any service computes targets from the shared pure package; the coach returns totals-vs-targets in one response (see §6)   | É3   | —          |
| B16 | É6 extras: routines pré-faites (Full Body / Haut-Bas / PPL templates avec rotation auto), GIF/vidéo média library, rest-timer config                                                             | É6   | —          |
| B17 | Real push delivery: vendor choice (FCM/APNs), device-token registration endpoint, provider impl behind D6's port                                                                                 | É9   | D6         |
| B18 | Scheduler hardening: fire default reminders for users without a stored prefs row; shard the per-minute scan before real scale                                                                    | É9   | —          |
| B19 | ~~(reserved)~~ — skipped to keep IDs monotonic                                                                                                                                                   | —    | —          |
| B20 | Mobile secure token storage: move the JWT pair from `shared_preferences` (plaintext) to `flutter_secure_storage` (Keychain/Keystore) before a store release                                      | —    | B12        |
| B21 | Mobile feature screens per épic: journal/hydration/workout/coach/notifications/settings UIs + the offline sync queue (offline-first-mobile skill); each new screen extends the on-device journey | —    | B12        |

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
| D6 vendor choice     | B17 real push delivery                                          |
| D9 prod enablement   | Real Claude answers in prod (needs ANTHROPIC_API_KEY + eval)    |
| D5 supersession      | Coach exists — wire suggestion → coach advice when D9 goes prod |
| B12 mobile shell ✓   | landed — unblocks B20 (secure storage), B21 (feature screens)   |

---

## 6. Resolved log

Move items here when ticked (date · ID · what landed · PR).

- 2026-07-13 · B12 · Flutter app shell landed under `mobile/`: envelope-aware API client (bearer + one-shot refresh-and-replay on 401), session controller driving unauth→onboarding→dashboard, login/register/onboarding (É1)/dashboard (É1 targets + É10 streaks/défi) screens; 10 widget/client tests offline + an on-device `integration_test/` journey against the compose stack; CI `mobile` job (analyze + test). Flutter 3.44.6.
- 2026-07-13 · B9+B11 · gamification-service landed (streaks/badges/défis hebdo driven by the four existing tracking events; célébrations reach the notification inbox through `badge.earned`/`challenge.completed`); réglages landed (display units in profile-service, `gamification_enabled` toggle, RGPD `DELETE /auth/account` with cascade wipe + `user.deleted`).
- 2026-07-12 · B8+B15 · coach-service landed: swappable LLM port (mock/Claude claude-opus-4-8), conseil du jour (Redis-cached), chat with persisted history, bilan hebdo, pure plateau detection; computeTargets extracted to @platform/domain (B15 resolved — cross-service targets without duplication).
- 2026-07-12 · B7 · notification-service landed: preferences (per-type toggles + horaires), minute scheduler (repas/eau/compléments/séance), weight.logged consumer → alerte objectif, deduped inbox + mock push port.
- 2026-07-12 · B5+B6 · hydration + supplements modules landed in nutrition-service: quick-add water w/ day totals, supplement list (dosage + horaires) w/ intake history + deactivation.
- 2026-07-12 · B3 · workout-service landed: seeded exercise library (20 moves, filter by muscle/equipment) + custom exercises, sessions (sets×reps×poids×repos), RPE completion with MET kcal estimate, per-exercise progression curve, next-session suggestion.
- 2026-07-11 · B2 · nutrition-service landed: OFF/mock provider port, food search/barcode/custom, favorites/recents, journal with snapshot macros + day totals.
- 2026-07-11 · (bootstrap item) "replace the example `Place` domain" → NutriBalance schema (users/profiles/weight_entries) landed with the foundation slice.
- 2026-07-11 · (bootstrap item) "wire the auth service (É2)" → `services/auth-service` issues/rotates/revokes JWTs; e2e login helper implemented; CI e2e job enabled.

---

## 7. Changelog (per slice)

- **2026-07-13 · B12 slice** — the Flutter app shell + first authenticated
  journey under `mobile/`. An envelope-aware `ApiClient` speaks the platform's
  `{success, data}`/`{success, error}` contract, attaches the bearer token and
  transparently refreshes once on a 401 before replaying (a second failure kills
  the session). A `SessionController` owns the lifecycle
  (unauthenticated → needsOnboarding → authenticated) and an `AuthGate` routes
  off it, so auth transitions never leave a stale stack. Screens: login,
  register, onboarding (the É1 target-formula inputs), and a dashboard reading
  live `/profile/targets` (É1) next to `/gamification/streaks` + `/challenge`
  (É10). Verified: 10 widget/client tests run offline against a mocked backend
  (envelope parsing, the refresh-replay path, the full register→onboarding→
  dashboard journey, form-validation gating, session-persistence + logout);
  an on-device `integration_test/` journey drives the same flow against the
  live compose stack (the UI counterpart of the Cucumber suite —
  `flutter-integration-testing` skill). `flutter analyze` + `flutter test` run
  in CI on every push (new `mobile` job, Flutter 3.44.6). B12 resolved; B20
  (secure token storage), B21 (per-épic feature screens + offline sync queue)
  opened. Next: B21 (more screens), B4 (É7 extras), B10 (É11 intégrations).
- **2026-07-13 · É10+É12 slice** — `gamification-service` (port 3008),
  entirely bus-driven: the four tracking events the other épics already
  publish (journal/hydratation/compléments/séances) advance pure
  `advanceStreak` chains (D10 — UTC days, backfills never rewind), award
  code-side catalogue badges (D11 — idempotent via composite PK +
  `createMany skipDuplicates`), and move the deterministic défi hebdo
  (D12 — ISO-week rotation, def frozen per row). `GET /gamification/
streaks|badges|challenge`; publishes `badge.earned`/`challenge.completed`,
  consumed by notification-service (gated by the new `gamification_enabled`
  per-type toggle) into célébration inbox rows. É12: `user_settings`
  display units in profile-service (D13 — API stays metric; shared
  1-decimal converters in @platform/domain) and RGPD
  `DELETE /auth/account` (D14 — password re-confirm, single cascade wipe,
  session kill, `user.deleted` event). Boundary unit tests on the three
  pure rule files + deletion/units tests; `settings.feature` +
  `gamification.feature` e2e (6 scenarios — the badge célébration is
  asserted through two RabbitMQ hops). B9, B11 resolved; D10-D14 opened.
  Next: B4 (É7 extras), B10 (É11 intégrations), B12 (Flutter, needs
  toolchain).
- **2026-07-12 · É8 slice** — `coach-service` (port 3007) on the Claude API:
  swappable `COACH_LLM_PROVIDER` (deterministic mock for dev/CI; Claude
  `claude-opus-4-8` impl via @anthropic-ai/sdk with adaptive thinking,
  refusal handling, best-effort fallback — D9); pure `detectPlateau` (D8)
  and pure French prompt-context builders; cross-table aggregation of
  journal/hydration/workouts/weights vs targets (X3); conseil du jour
  (Redis-cached 6h), chat coach with `coach_messages` history, bilan hebdo
  (cached 24h). `computeTargets` extracted from profile-service into the
  new **`@platform/domain`** package (tsconfig path maps updated in both
  files per convention #3) — resolves B15. 13 unit tests; `coach.feature`
  e2e (4 scenarios incl. cache hit + facts assertions). B8, B15 resolved;
  D8, D9 opened. Next: B11 (É12 réglages), B9 (É10), B4, B12 (Flutter).
- **2026-07-12 · É9 slice** — `notification-service` (port 3006):
  `NotificationPreference` + `Notification` inbox models (unique
  `(user_id, dedupe_key)` makes every firing idempotent) + migration;
  preferences GET/PUT with schema-mirrored defaults; minute scheduler
  (`@nestjs/schedule`) firing meal/hydration/workout reminders from prefs
  and supplement reminders from the É5 schedule (X3 cross-table read);
  the platform's first bus consumer — `weight.logged` → pure
  `isGoalReached` → alerte objectif; single `dispatch()` path: deduped
  inbox row, then best-effort mock push (D6 port) + `notification.sent`;
  pure `reminder-rules` (D7: UTC times, 08:00-22:00 waking window) with
  13 unit tests incl. the scheduler orchestration; Kong/compose/smoke
  wiring; `notifications.feature` e2e — the goal alert is asserted
  end-to-end through RabbitMQ with the polling step. B7 resolved; D6, D7,
  B17, B18 opened. Confort tier complete. Next: B8 (É8 AI coach — fully
  unblocked), B4 (É7 extras), B12 (Flutter, needs toolchain).
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
