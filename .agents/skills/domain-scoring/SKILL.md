---
name: domain-scoring
description:
  Implement a domain score/derivation (reputation, priority, commission tier,
  risk, ranking) as a pure, unit-tested function that a service feeds with raw
  aggregates and optionally persists. Use when a spec asks for a computed score
  or a rule-based derived value, especially when the weights/rules are not yet
  finalized. Triggers on "reputation score", "priority algorithm", "commission
  tier", "risk score", "ranking", "weighted score", "scoring formula", "derived
  metric".
---

# Domain scoring (pure selector + persist)

Whenever the product needs a **computed number or tier** from other data —
reputation, an allocation priority, a commission rate, a risk band — resist
scattering the arithmetic through a service. Isolate it as a **pure function**
the service feeds with already-fetched aggregates. This keeps the rule testable,
reviewable, and swappable while the business still argues about the weights.

## The shape

1. **A pure scorer** — `computeX(inputs): { score, breakdown }`. No I/O, no
   framework. Inputs are plain numbers/flags the caller aggregated. Return the
   score **plus a breakdown** of each contributing factor — the breakdown is
   what makes the score explainable in the UI and debuggable in tests.
2. **A service** that gathers the raw aggregates (counts, averages, sums) from
   the datastore, calls the scorer, and — if the value is queried often —
   **writes it through** to a stored column so it's filterable, while still
   recomputing on read so it can't go stale.
3. **An endpoint** returning `{ score, breakdown, …raw factors }` so clients can
   both display the number and show why.
4. **Unit tests on the pure function** covering the boundaries: the empty/new
   case (unrated / zero), each factor in isolation, and the clamp at both ends.

## Rules-not-yet-final: write them down

Scoring weights are almost always provisional. Treat the formula as a **decision
that needs product sign-off**:

- Name the constants (`MAX_VOLUME_BONUS`, `NEUTRAL_BASE`, …) instead of burying
  magic numbers, so a reviewer can see and tune them.
- Record the formula, every factor, and the **open questions** in a decision doc
  (a `D#`/backlog item), and mark the code with the id (`// backlog: D9`).
- Flag the specific judgment calls for review: the weights themselves, what
  counts as a negative signal, and the "unrated vs. neutral vs. penalised"
  choice for a brand-new subject.

## Gotchas

- **Unrated ≠ bad.** A subject with no history should be distinguishable from a
  0-because-terrible one — return a sentinel or a separate `rated` flag, and
  decide with product how the UI shows it.
- **Clamp both ends** and round to the stored column's precision (e.g. a
  Decimal(3,2) holds 0.00–9.99).
- **Recompute on read, persist as a cache.** Don't let a stored score drift from
  the data; the column is an index/filter convenience, not the source of truth.
- **Don't fetch inside the scorer.** Aggregation belongs to the service so the
  scorer stays pure and the DB and in-memory paths can't diverge.

## Where instances live

Concrete scorers stay in the product repo (reputation, allocation priority,
commission tiers, adoption aggregations…): a pure `computeX.ts` next to the
service that feeds it, plus a decision record for the weights. Register the
weights decision as a `D#` item in `docs/architecture/backlog.md` and mark the
code with it (`// backlog: D#`).
