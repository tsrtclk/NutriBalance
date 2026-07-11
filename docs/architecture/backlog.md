# Backlog & Open Decisions

> **This file is the project's memory of deferred work and undefined rules.**
> Maintaining it is part of Definition of Done for **every** PR — see the
> "Backlog discipline" section in `AGENTS.md`. Every item has a **stable ID**
> (`D#` decision, `B#` feature, `X#` cross-cutting). Reference IDs from code
> (`// backlog: D1`), commit bodies, and PRs so code ↔ backlog stay linked.

**Last updated:** 2026-07-11 (bootstrap from platform-skeleton; épics seeded
from `docs/product/backlog.md`).

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

| Tier    | Épics                                                            | State                                  |
| ------- | ---------------------------------------------------------------- | -------------------------------------- |
| MVP     | É1 profil/onboarding · É3 alimentaire · É6 sportif · É7 progrès  | ⬜ not started                         |
| MVP     | É2 authentification                                              | 🟠 done per product backlog, not wired |
| Confort | É4 hydratation · É5 compléments · É9 notifications               | ⬜ not started                         |
| Diff.   | É8 IA coach · É10 gamification · É11 intégrations · É12 réglages | ⬜ not started                         |

---

## 2. Open decisions (undefined rules)

Code uses a safe default + a `// backlog: D#` comment. Each needs a product call.

_(none yet)_

---

## 3. Feature backlog

"Blocked by" → the decisions/services/X-items that must exist first.

_(none yet)_

---

## 4. Cross-cutting TODOs (touch many services)

_(none yet)_

---

## 5. Dependency ledger

Forward map: when a blocker lands, what to unblock.

| Blocker (resolve →) | Unblocks |
| ------------------- | -------- |

---

## 6. Resolved log

Move items here when ticked (date · ID · what landed · PR).

_(none yet)_

---

## 7. Changelog (per slice)

- **2026-07-11 · bootstrap** — repo initiated from `platform-skeleton`
  (incl. the fresh koydas sync: SyncEngine, 7 new generic skills,
  accessibility checklists, upstream-sync ledger). Imported the product
  backlog to `docs/product/backlog.md`; seeded §1 with the épic tiers.
  Next slices: replace the example `Place` domain, wire the auth service
  (É2), start É1/É3.
