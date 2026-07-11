---
name: mobile-ux-review
description: A UX/UI review lens + UX-layer architecture guide for mobile apps
  (cross-framework, Flutter examples) — spot interaction/layout/error/i18n
  problems, log them to a UX rework backlog, and architect the fix as shared
  primitives (empty states, form sheets, one error pipeline, stack-preserving
  navigation). Use when building or reviewing a mobile screen, or assessing UI
  quality.
---

# Mobile UX review

When you build or touch a screen, run this lens and log anything new to the
repo's UX backlog (a `ux-backlog.md` with stable `U#` ids alongside the feature
backlog). Don't fix silently and don't let debt rot.

## Review checklist (per screen)

- **Reachability:** how many taps/scrolls to the primary action? A flat list of
  many feature cards buries things — prefer grouped sections, a grid, or a
  bottom nav for the top destinations. (If an integration test must scroll hard
  to reach a control, that's the smell.)
- **One clear primary action:** avoid two same-looking affordances with
  different meaning (e.g. an AppBar `+` and a FAB that add different things).
  Label them.
- **Create flows:** full screen or bottom sheet, not a cramped `AlertDialog`.
- **Errors are for humans:** never put raw exception/transport text in a
  SnackBar. Map an error `code` to a localized message.
- **Layout robustness:** avoid fixed `childAspectRatio`/heights that overflow at
  larger text scale. Verify at text scale 1.0 and ~1.3.
- **Empty states guide:** icon + message + a primary action, via a shared widget
  — not a bare "nothing here".
- **Auth niceties:** explicit confirm, a visible resend countdown; beware
  auto-submitting on the last digit (fires on paste).
- **i18n / a11y:** strings extractable (ARB/intl), contrast + scale checked,
  semantics labels on icon-only buttons.

## Architecting the UX layer (cross-framework)

The fixes above stop recurring only when the UX layer is **architected**, not
patched per screen. These rules are framework-agnostic; the examples map to
Flutter but translate 1:1 to React Native / SwiftUI / Compose.

1. **One blessed primitive per UX pattern**, in a shared widgets/components
   directory; screens compose them and never hand-roll a variant. The proven
   starter set:
   - `EmptyState` (icon + message + optional action) — every list/section.
   - `FormSheet` / bottom-sheet presenter for create/edit forms (drag handle,
     full-width fields, keyboard-aware padding) — never a cramped alert dialog.
   - Capability views that **degrade gracefully** when a token/provider is
     missing (e.g. a map view that renders coordinates + a hint without the map
     SDK key) so dev/CI/tests run unconfigured. When a screen needs a "slightly
     different" version, extend the primitive with a parameter — a second
     implementation is the smell.
2. **One error pipeline between transport and UI.** A single humanizer function
   is the only thing allowed to turn an exception into user text: prefer the
   API's localized `error.message`, map connectivity failures to a network
   message, else the screen's short fallback. Grep-able rule: the raw exception
   (`$e`, `error.toString()`) never appears in a UI string.
3. **Stack-preserving navigation grammar.** Back = pop; after-create =
   replace-to-detail (back chain stays root → list → detail); after-edit/delete
   = pop to an invalidated parent. Never "navigate by resetting to an absolute
   route" for back/after-action — it strips the stack and strands the user
   (breaks system back/swipe too). Use the platform's native back affordance,
   not custom back buttons.
4. **Content-sized layout, never fixed ratios/heights** for text-bearing cards:
   intrinsic-height row pairs (or auto-sizing grid cells) so tiles grow with the
   user's text scale. Verify at ~1.3× scale.
5. **Primary-action grammar:** one labelled primary action per screen (FAB or
   prominent button); secondary creators are labelled buttons in their section's
   header — never two identical unlabelled "+" with different meanings.
6. **Information architecture over lists:** group destinations into titled
   sections/grids with a header (identity/greeting) rather than one long card
   list.
7. **Testability is part of UX architecture:** stable keys on fields the tests
   must target; primitives that keep finders working (a sheet keeps the same
   field/button finders a dialog had). If an integration test must fight a
   screen, the screen is wrong.

## How to log

Add a row to the `U#` table (severity 🔴 hurts task completion / 🟡 friction /
⚪ nice-to-have, area, issue) plus a Details section: what's wrong, where, and a
concrete **Rework** note. Ship fixes as their own PRs tagged `ux: U#` and tick
them off. Keep the backlog the single source of UX debt.
