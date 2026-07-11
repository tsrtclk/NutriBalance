---
name: accessibility-benchmarks
description:
  The four accessibility benchmarks that matter for a consumer app in the EU —
  WCAG 2.2, EAA (European Accessibility Act), RGAA, APCA — what each requires,
  how they relate, and how to TEST against each (automated + manual), with
  Flutter examples. Use when auditing, building, or testing accessibility.
---

# Accessibility benchmarks & how to test each

Four names, one stack: **WCAG 2.2** is the technical standard; **EAA** is the EU
law that makes (most of) it mandatory; **RGAA** is France's audit method on top
of WCAG; **APCA** is the next-generation contrast algorithm. Test against WCAG
2.2 AA and you cover the legal core of all of them.

## WCAG 2.2 (W3C — the technical base)

Level AA is the practical target. The criteria that dominate mobile audits:

| Criterion                                 | Requirement                                                            | Mobile translation                                              |
| ----------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1.4.3 Contrast                            | text ≥ 4.5:1 (≥ 3:1 for large ≥18pt/14pt-bold)                         | muted "hint" colors on tinted backgrounds are the usual failure |
| 1.4.4 Resize text                         | usable at 200 % text scale                                             | content-sized layout, no fixed-ratio cards                      |
| 1.4.11 Non-text contrast                  | UI components/icons ≥ 3:1                                              | outline-only borders, disabled-looking chips                    |
| 2.5.8 Target size (new in 2.2)            | pointer targets ≥ 24×24 CSS px (platform HIGs say 44 iOS / 48 Android) | icon buttons, list-row trailing actions                         |
| 2.5.7 Dragging movements (new)            | drag interactions need a non-drag alternative                          | swipe-to-X needs a button too                                   |
| 3.3.8 Accessible authentication (new)     | no cognitive test to log in                                            | OTP paste must work; no puzzle CAPTCHAs                         |
| 1.1.1 / 4.1.2 Name, role, value           | every control exposed to AT with a label                               | tooltips/semantic labels on icon-only buttons                   |
| 2.4.7 Focus visible / 2.4.11 not obscured | visible, unobscured focus                                              | keyboard/switch access on tablets                               |

**Test (Flutter, automated):** the framework ships guideline matchers that run
in widget _and_ integration tests:

```dart
await expectLater(tester, meetsGuideline(textContrastGuideline));      // 1.4.3
await expectLater(tester, meetsGuideline(androidTapTargetGuideline));  // 48dp
await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));      // 44pt
await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));  // 4.1.2
```

Run them at each checkpoint of the UI journey (login, home, per-feature screens)
so every merged screen change is re-audited. **Manual:** VoiceOver/ TalkBack
walkthrough of the money paths; 200 % text scale; keyboard focus.

## EAA — European Accessibility Act (the law)

- EU **Directive 2019/882**, enforced from **28 June 2025**; applies to
  consumer-facing digital products/services in the EU — **including mobile
  apps** (e-commerce, banking, marketplaces…). Micro-enterprises (<10 staff,
  <€2M) are partially exempt, but marketplaces rarely stay micro.
- Technical presumption of conformity via **EN 301 549**, which for apps means
  **WCAG 2.1 AA applied to software** (2.2 alignment in progress — build to 2.2
  AA and you're ahead).
- Beyond the UI: accessible support channels and an **accessibility statement**.
- **Test:** = the WCAG battery above **plus** an EN 301 549 checklist pass
  (platform AT interop: screen reader, captions if media, orientation both ways)
  and the published statement.

## RGAA (France — audit methodology)

- **RGAA 4.x** is France's official method: WCAG AA re-expressed as **106
  concrete test criteria** with per-criterion pass/fail; mandatory for French
  public sector and, via the French EAA transposition, relevant to services sold
  into France.
- Produces a **conformity score** (% of applicable criteria passed) and requires
  a **déclaration d'accessibilité** (compliance page: score, known exceptions,
  feedback channel).
- **Test:** run the WCAG battery, then walk the RGAA criterion list for the
  audited screens, record pass/fail/NA per criterion, publish the score. For a
  mobile app, RGAA defers to EN 301 549 §11 (software) — same criteria set.

## APCA 3.0 (contrast, next generation)

- The **Accessible Perceptual Contrast Algorithm** (WCAG 3 draft) replaces the
  WCAG 2 ratio with perceptual lightness contrast **Lc (−108…106)**, weighted by
  font size/weight: body text wants **Lc ≥ 75**, large/bold ≥ 60, non-text ≥ 45.
  It catches failures WCAG 2 misses (thin light-grey text "passing" 4.5:1) and
  un-fails some dark-mode pairs WCAG 2 wrongly rejects.
- **Not yet a legal requirement** — WCAG 2.x ratios remain the compliance bar.
  Use APCA as the _design_ bar, WCAG 2 as the _legal_ bar: pick palette pairs
  that pass both.
- **Test:** no built-in matcher; check the theme's actual pairs (onSurface/
  surface, outline/background, onPrimary/primary…) with an APCA calculator (e.g.
  apcacontrast.com) at design time, and keep muted text at or above the scheme's
  `onSurfaceVariant` rather than `outline`.

## Order of work in an audit

1. Automated WCAG battery on every journey checkpoint (fails fast, cheap).
2. Fix systemic causes in the **theme/primitives**, not per screen (contrast →
   color scheme; targets → min-size in component themes; labels → shared widgets
   always take a semantic label).
3. Manual screen-reader pass on the top 3 user paths.
4. Statement + score if EAA/RGAA applies to your market.

Related: `mobile-ux-review` (a11y rides the review checklist),
`incremental-i18n-rollout` (labels/tooltips localize like any string),
`flutter-integration-testing` (where the battery runs).
