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
| U2  | 🟡  | Errors     | Shared snackbar primitive landed; auth screens not yet migrated to it |

## Details

### U1 — Onboarding is one long form 🟡

`mobile/lib/src/screens/onboarding_screen.dart` stacks 6 fields + submit in a
single `SingleChildScrollView`; on a small viewport the primary action sits
below the fold (the widget test has to `ensureVisible` it). **Rework:** split
into a 2–3 step `Stepper`/`PageView` (identity → mensurations → objectif), or
pin the submit button to the bottom with a `Scaffold.bottomNavigationBar`.

### U2 — Finish migrating to the shared error pipeline 🟡

The shared surface now exists — `mobile/lib/src/widgets/error_snackbar.dart`
(`showApiError`, keyed to `ApiException.code`), used by the hydration and
settings screens. **Remaining:** login/register/onboarding still render their
own inline `Key('*_error')` `Text`; migrate them (or keep inline field errors
but route transient failures through the snackbar) so there's one copy source.

## Resolved

- **U3 — Dashboard was a dead end** ⚪ (B21 slice 1). The dashboard is now the
  Accueil tab of a `HomeShell` `NavigationBar` (Accueil · Hydratation ·
  Réglages); logout moved to Réglages, removing the two-affordance smell.
  More tabs (Journal · Séances · Coach) land with the rest of B21.

## How to apply

Pick a `U#`, do it as its own PR, tick it here (move to Resolved), and note any
new issues found. Reference the ID in the commit (`ux: U#`). When an
integration test has to fight the layout to interact with something, that's a
UX smell — log it.
