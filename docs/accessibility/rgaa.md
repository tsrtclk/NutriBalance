# RGAA — rule checklist (static audit)

> **RGAA 4.x** is France's official audit methodology: WCAG AA re-expressed as
> ~106 pass/fail criteria + a published conformity score. Relevant when selling
> into France (EAA transposition). For a mobile app RGAA defers to **EN 301 549
> §11** — so the technical work = the WCAG checklist; RGAA adds the _method_ and
> the _declaration_. Details: the `accessibility-benchmarks` skill. Base:
> [`wcag-2.2.md`](./wcag-2.2.md) · law: [`eaa.md`](./eaa.md).

## Method (per audit round)

- [x] Define the audited sample: the integration-journey checkpoints (login,
      home, dashboard) + every screen the journey walks.
- [x] Run the automated criteria (contrast, targets, labels) — the journey
      battery is the executable subset.
- [ ] Walk the remaining applicable criteria manually per screen; record **pass
      / fail / not-applicable** for each (spreadsheet or this file's per-screen
      tables).
- [ ] Compute the score: `passed / applicable` (%); RGAA "conforme" ≥ 100 %,
      "partiellement conforme" ≥ 50 %.

## Declaration (déclaration d'accessibilité)

- [ ] Publish the declaration: conformity status + score, audit date/method,
      known non-conformities with justification, feedback + escalation channel
      (required when serving France; pair with the EAA statement).

## Current status

Automated subset green in CI-equivalent (integration journey). Full manual
criterion walk + declaration are release-gated for the FR market — tracked in
`docs/release-checklist.md`.
