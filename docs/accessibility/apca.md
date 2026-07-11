# APCA — contrast rule checklist (static audit)

> **Accessible Perceptual Contrast Algorithm** (WCAG 3 draft). Not yet the legal
> bar (WCAG 2.x ratios are — see [`wcag-2.2.md`](./wcag-2.2.md)); we use APCA as
> the **design bar** so palette choices pass both. Details + calculator
> workflow: the `accessibility-benchmarks` skill.

## Thresholds (Lc, lightness contrast −108…106)

| Use                                              | Minimum Lc |
| ------------------------------------------------ | ---------- |
| Body text (< 18 px regular)                      | **75**     |
| Large / bold text                                | **60**     |
| Non-text UI (icons, borders that convey meaning) | **45**     |
| Placeholder / disabled (non-essential)           | 30         |

## Palette pairs to keep audited (theme = single source)

Check with an APCA calculator whenever `lib/app/theme.dart` or the seed color
changes:

- [x] `onSurface` on `surface` / on `background` (body text)
- [x] `onSurfaceVariant` on `background` — the **muted-text rule**: muted text
      uses `onSurfaceVariant`, never `outline` (outline ≈ 3.6:1 WCAG / Lc too
      low for body; it's for borders). Enforced by the journey's contrast
      battery.
- [x] `onPrimary` on `primary` (gradient header, FAB)
- [x] `onPrimaryContainer` on `primaryContainer` (dashboard hero card)
- [ ] Dark-mode mirrors of all pairs (theme builder mirrors automatically;
      verify Lc after any seed change)

## Rules of thumb encoded in the app

1. All colors come from the `ColorScheme` — no hardcoded greys (an APCA audit is
   then just the table above, not a per-screen hunt).
2. Thin/light fonts need more Lc — the theme keeps body at regular weight, muted
   text at `onSurfaceVariant`, and never uses opacity to "mute" text.
3. WCAG 2 ratio remains the merge gate (automated); APCA is checked at design
   time for new palette pairs.
