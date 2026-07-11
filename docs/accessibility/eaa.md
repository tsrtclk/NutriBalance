# EAA (European Accessibility Act) — rule checklist (static audit)

> EU **Directive 2019/882**, enforced since **28 June 2025** — applies to
> consumer-facing apps sold in the EU (marketplaces, payments and similar
> consumer services are in scope). Conformity presumption via **EN 301 549** (software
> clauses ⇒ WCAG AA applied to the app). Details + testing: the
> `accessibility-benchmarks` skill. Base: [`wcag-2.2.md`](./wcag-2.2.md).

## Technical (EN 301 549 §11 — software)

- [x] WCAG AA on all screens — see the WCAG checklist; automated battery runs in
      the integration journey.
- [ ] **Platform AT interop** — VoiceOver (iOS) + TalkBack (Android) manual
      walkthrough of the top 3 paths (login→home, book a tool, report
      emergency).
- [x] **Orientation** — app is portrait-locked by product decision; EAA allows a
      justified restriction, revisit for tablets.
- [ ] **Captions/audio description** — N/A today (no media); tick when voice
      notes (B10) land.

## Organizational (beyond the UI)

- [ ] **Accessibility statement** published (in-app page + store listing):
      conformity status, known limitations, feedback channel.
- [ ] **Accessible support channel** (the feedback/contact path itself meets
      WCAG).
- [ ] **Procurement/vendor clause** — third-party SDK UIs (payment provider
      D3/B4a, Mapbox) must not break conformity; audit on integration.

## Status

Core UI conformity is automated + green; the organizational artifacts
(statement, support channel) are release-gated — tracked in
`docs/release-checklist.md`.
