# WCAG 2.2 — rule checklist (static audit)

> Target: **Level AA**. Tick per audit; keep evidence next to the box.
> How-to-test per rule: the `accessibility-benchmarks` skill. Enforcement:
> `checkA11y()` runs the automated battery at every integration-journey
> checkpoint (see AGENTS.md "Accessibility"). Companion checklists:
> [`eaa.md`](./eaa.md) · [`rgaa.md`](./rgaa.md) · [`apca.md`](./apca.md).

## Perceivable

- [x] **1.1.1 Non-text content** — icon-only buttons have tooltips/labels;
      decorative emojis `ExcludeSemantics` (audit 2026-07).
- [x] **1.4.3 Contrast (minimum)** — text ≥ 4.5:1 (large ≥ 3:1). Enforced by
      `textContrastGuideline` in the journey. Rule: muted text uses
      `onSurfaceVariant`, never `outline` (which is for borders).
- [x] **1.4.4 Resize text** — content-sized layout (no fixed-ratio cards, U5);
      spot-check at 200 % scale.
- [ ] **1.4.11 Non-text contrast** — UI components/icons ≥ 3:1. `outline`-tinted
      icons pass at 3.6:1; re-check on any palette change.
- [ ] **1.4.10 Reflow** — verify no horizontal scroll at 200 % / small widths.

## Operable

- [x] **2.5.8 Target size (minimum)** — ≥ 24 px (we hold the platform HIGs: 44
      iOS / 48 Android). Enforced by `iOSTapTargetGuideline` in the journey.
- [ ] **2.5.7 Dragging movements** — swipe-only actions need a button
      alternative (sheet dismiss also has system back — OK; re-audit new
      gestures).
- [ ] **2.4.7 / 2.4.11 Focus visible & not obscured** — keyboard/switch access;
      audit when tablet/keyboard support lands.

## Understandable

- [x] **3.3.8 Accessible authentication** — OTP field accepts paste; no
      cognitive puzzles at login.
- [x] **3.2.3 Consistent navigation** — native back everywhere (U9/U10);
      sectioned home (U1).
- [x] **3.3.1/3.3.3 Error identification & suggestion** — humanized, localized
      error messages (U4).

## Robust

- [x] **4.1.2 Name, role, value** — enforced by `labeledTapTargetGuideline` in
      the journey; shared primitives take semantic labels.
