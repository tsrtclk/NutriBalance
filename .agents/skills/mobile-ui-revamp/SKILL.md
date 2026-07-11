---
name: mobile-ui-revamp
description:
  Revamp a mobile app's look and feel to "true app" quality — a coherent
  theme/component system + purposeful, test-safe motion (page transitions,
  staggered entrances, count-ups). Framework-agnostic principles with Flutter
  (Material 3) examples. Use when asked to make the UI appealing, animated,
  branded, or polished.
---

# Mobile UI revamp (theme system + motion)

A revamp is **two systems, not per-screen decoration**: a component theme every
widget inherits, and a small set of one-shot motion primitives every screen
composes. Do it in this order.

## 1. Theme/component system (one file, app-wide effect)

Centralize in the app theme so screens contain zero styling decisions:

- **Seeded color scheme** from the brand color (`ColorScheme.fromSeed`), one
  `_base(brightness)` builder so **dark mode mirrors light for free**.
- **Shape language**: one radius scale (e.g. 12 inputs / 14 buttons / 16 cards /
  24 sheet tops) applied via component themes (`cardTheme`, `filledButtonTheme`,
  `floatingActionButtonTheme`, `bottomSheetTheme`…), never inline.
- **Calm elevation**: flat cards with a hairline `outlineVariant` border read
  more premium than drop shadows; keep real elevation for FABs/sheets.
- **Floating, rounded snackbars**; consistent `inputDecorationTheme` (filled,
  borderless); AppBar with `scrolledUnderElevation: 0` and a strong title style.
- **Page transitions belong to the theme** (`pageTransitionsTheme`): forward-
  fade on Android, native Cupertino slide on iOS — navigation instantly feels
  "real app". (Flutter: `FadeForwardsPageTransitionsBuilder` +
  `CupertinoPageTransitionsBuilder`; the latter imports from
  `flutter/cupertino.dart` in newer SDKs.)
- Accent moments sparingly: one **gradient hero/header** per app (brand color →
  85 % alpha), icon-in-tinted-circle avatars for tiles.

## 2. Motion primitives (shared, one-shot, test-safe)

Put 2–3 primitives in the shared widgets directory; screens compose them:

- **`FadeSlideIn`** — opacity + small upward offset entrance (~350 ms,
  `easeOutCubic`), with a `delay` parameter; stagger lists/grids with
  `i * 40–60 ms`.
- **`CountUp`** — tween a number for dashboard totals (~700 ms).
- Interactive feedback comes free from the framework (ink ripples) when tiles
  are real tappable surfaces (`Card` + `InkWell`), not `GestureDetector`s.

**The test-safety rules (hard):**

- Every animation must **settle** — one-shot only. A repeating/infinite
  animation (shimmer skeletons, pulsing badges) makes `pumpAndSettle`-style test
  waits hang forever. If you want shimmer, gate it out of tests or bound its
  repetitions.
- **Implement stagger with `Interval` curves inside one controller, never
  `Future.delayed`**: a pending timer schedules no frames, so settle-waits
  return in the gap and the entrance then shifts layout mid-interaction (taps
  miss). `duration = delay + anim`, curve
  `Interval(delay/total, 1, curve: easeOutCubic)`, `forward()` in `initState`.

Motion grammar: entrance = fade+rise; navigation = the theme's transitions;
feedback = ripple; celebration/emphasis = count-up. Nothing loops, nothing
bounces, nothing exceeds ~700 ms.

## 3. Verify like any other change

Analyze/tests, then the UI journey on a device/simulator — the revamp must not
move finders (same texts/keys, same tappable surfaces). Check text-scale ~1.3×
(content-sized layout, see `mobile-ux-review`) and both brightnesses.

## Related

`mobile-ux-review` (UX-layer architecture: primitives, nav grammar, error
pipeline) · `flutter-ui-ux` community skill (component/animation catalogs) ·
`flutter-integration-testing` (keeping the journey green through UI changes).
