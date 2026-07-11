---
name: incremental-i18n-rollout
description:
  Roll out i18n/l10n in a live app incrementally and in parallel — infra first,
  source-locale pinned, screens migrated independently per feature/PR — without
  ever shipping a mixed-language UI. Framework-agnostic strategy with Flutter
  (gen_l10n/ARB) examples.
---

# Incremental i18n rollout (parallel-safe)

Extracting hundreds of inline strings in one PR is how i18n efforts die. This is
the strategy that works on a **live** app: one infra PR, then screens migrate
**independently and in parallel**, and the user never sees a half-translated UI.

## Phase 1 — infrastructure (one PR, zero visible change)

1. Wire the toolchain: message catalogs per locale + typed codegen accessors.
   Flutter: `l10n.yaml` (arb-dir, template), `lib/l10n/app_<src>.arb` +
   translations, `generate: true`, `AppLocalizations.delegate` +
   `supportedLocales` on the app widget, and a `context.l10n` extension.
2. **The template catalog is the source language** (the wording that already
   ships), not English-by-default — translators mirror it.
3. **Pin the app to the source locale** until extraction is complete:

   ```dart
   locale: const Locale('tr'), // flip to device-locale when extraction is done
   ```

   This is the rule that makes the whole rollout safe: migrated screens render
   the _same_ strings as before (they now come from the catalog), unmigrated
   screens keep their inline literals — the UI is always 100 % one language. It
   also keeps text-finder UI tests green throughout.

## Phase 2 — parallel migration (per feature, any order, any number of agents)

- **Unit of work = one feature/screen group per PR.** No coordination needed:
  catalog files only ever gain lines, so merges are trivial; avoid key
  collisions with per-feature key prefixes (`loginPhoneLabel`,
  `dashboardTotal`).
- **Way-of-work rule:** any screen you _touch_ must come out reading from the
  catalog — no new inline user-facing literals (this converges the codebase
  without a big-bang).
- Mechanics that recur (Flutter, but analogous everywhere):
  - `const` poisoning: a `const` widget/`InputDecoration` can't take a catalog
    string — drop `const` on the container, keep it on const children.
  - **Const/global UI tables can't hold catalog strings** — turn
    `const _sections = [...]` into `_sections(AppLocalizations t) => [...]`
    built inside `build(context)`.
  - Parameterized strings via placeholders (`"otpSentTo": "Sent to {phone}"` →
    `t.otpSentTo(phone)`), never string concatenation.
  - Context-free code (pure error mappers, background isolates) can't reach the
    catalog — pass the localized string in from the widget layer (e.g. a
    humanizer's `fallback` parameter).

## Phase 3 — flip + verify

1. Grep-able done check: no user-facing string literals left in the UI layer
   (spot with a script for quoted strings containing letters in widget files).
2. Replace the pinned locale with device-locale resolution (+ source-language
   fallback).
3. Run the UI test suite with the app **pinned to the source locale** via a
   build-time override (e.g. a `LOCALE_OVERRIDE` dart-define consulted by the
   app widget) — text finders are locale-bound by construction. Migrating
   finders to stable keys/semantic ids removes the pin later.
4. Two more mechanics the analyzer will surface at scale: label maps living in
   **data-model files** (no context) become functions taking the localizations
   object, with getters → methods; and catalog reads **after an `await`** trip
   `use_build_context_synchronously` — hoist `final l10n = context.l10n;` to the
   top of the async handler.

## A11y rides along

While touching every screen anyway: tooltips/semantic labels on icon-only
buttons (grep `IconButton(` without `tooltip`), text-scale check at ~1.3×
(content-sized layout, see `mobile-ux-review`), contrast via the theme's color
scheme rather than hardcoded colors.
