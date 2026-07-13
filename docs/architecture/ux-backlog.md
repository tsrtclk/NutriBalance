# UX / UI rework backlog (template)

> Design-debt companion to [`backlog.md`](./backlog.md). Log UX/UI issues found
> while building or integration-testing the app; each gets a stable ID (`U#`).
> See the `mobile-ux-review` skill for the review lens **and** the UX-layer
> architecture rules (shared primitives, one error pipeline, stack-preserving
> navigation). **Severity:** 🔴 hurts task completion · 🟡 friction/polish ·
> ⚪ nice-to-have.

| ID  | Sev | Area       | Issue                                                                 |
| --- | --- | ---------- | --------------------------------------------------------------------- |
| U1  | 🟡  | Onboarding | Single long scroll form; submit falls below the fold on small screens |
| U2  | 🟡  | Errors     | Each screen owns its own inline error text — no shared pipeline       |
| U3  | ⚪  | Dashboard  | Flat card list, no navigation to feature screens yet (arrive w/ B21)  |

## Details

### U1 — Onboarding is one long form 🟡

`mobile/lib/src/screens/onboarding_screen.dart` stacks 6 fields + submit in a
single `SingleChildScrollView`; on a small viewport the primary action sits
below the fold (the widget test has to `ensureVisible` it). **Rework:** split
into a 2–3 step `Stepper`/`PageView` (identity → mensurations → objectif), or
pin the submit button to the bottom with a `Scaffold.bottomNavigationBar`.

### U2 — No shared error pipeline 🟡

Login/register/onboarding each render their own `Key('*_error')` `Text`, and
the dashboard has its own retry state. **Rework:** one error surface (a
`ScaffoldMessenger` snackbar helper or a shared `ErrorBanner`) fed by the
`ApiException.code`, so copy + retry affordances stay consistent as screens
multiply under B21.

### U3 — Dashboard has no onward navigation ⚪

The dashboard is read-only cards; there's nowhere to log a meal/water/workout
yet. Expected — those screens are B21. **Rework:** add a bottom nav (Journal ·
Séances · Coach · Réglages) when the first feature screen lands.

## Resolved

<!-- Move fixed items here with what landed + what surfaced them. -->

## How to apply

Pick a `U#`, do it as its own PR, tick it here (move to Resolved), and note any
new issues found. Reference the ID in the commit (`ux: U#`). When an
integration test has to fight the layout to interact with something, that's a
UX smell — log it.
