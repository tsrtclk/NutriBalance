---
name: flutter-integration-testing
description: Write and stabilize Flutter integration tests that drive real screens against a live backend (not mocks). Use when adding/maintaining integration_test/ flows or when a UI-against-real-services test flakes.
---

# Flutter integration testing (screen ↔ live backend)

Drive the **real widget tree against a running backend** — the UI complement to
API-level e2e. Tests live in `integration_test/` and run on a device/emulator:

```bash
flutter test integration_test/ -d <device-id>      # device-id from `flutter devices`
```

Point the app at the backend with the same mechanism the app already uses
(commonly a `--dart-define=API_BASE_URL=...`). On the iOS simulator `localhost`
is the host machine; on the Android emulator the host is `10.0.2.2`.

## Getting past a real login (OTP / magic link / SMS)

An on-device test can't read an SMS or email. Add a **dev-only, env-gated**
endpoint on the auth service that returns the current code/token for an identifier
(e.g. `GET /auth/dev/otp?phone=…`, enabled by a flag like `AUTH_DEV_OTP_ECHO` set
**only** in the local stack, never in prod). The test fetches the code from it —
its stand-in for "reading the message" — then types it into the UI. Use a
**unique identifier per run** (random phone/email) so each run is an isolated new
user.

## Hard-won rules (these cause ~all the flake)

- **Two kinds of waiting — never a fixed `pumpAndSettle(Duration)` for content:**
  - **Navigation & dialogs animate** → they schedule frames → tap then
    `pumpAndSettle`. A pushed route slides in; act before it settles and the
    target is **off-screen** (you'll see a tap at an `Offset` whose x/y exceeds
    the render size) → hit-test miss.
  - **Network-driven content schedules no frames** → `pumpAndSettle` returns
    early → poll with a helper that `pump`s in a loop until the finder matches.
- **Devices persist the session** (secure storage / Hive). On relaunch the app
  may boot past login — have the launch helper detect "already authed" (e.g. a
  logout affordance is present) and log out first.
- **Localized back button:** `tester.pageBack()` looks for a tooltip `'Back'`; a
  non-English locale won't have it. Tap `find.byType(BackButton)` instead.
- **Tapping deep list items:** `ensureVisible` can leave the item at the exact
  scroll edge (offset == screen height) → miss. Scroll a **later** item into
  view so the target sits mid-list, then tap.
- **Disambiguate duplicate icons:** an AppBar action and a FAB may share an icon.
  Scope finders, e.g. `find.descendant(of: find.byType(AppBar), matching: find.byIcon(Icons.add))`.
- **A closing dialog briefly keeps its `TextField` text**, so just after submit a
  created value can match twice. Scope the assertion to the result row
  (`find.widgetWithText(Card, value)`), not bare `find.text(value)`.
- **Add `Key`s** to fields you must target instead of relying on `byType` when
  several of the same type exist.

## Structure

Prefer one authenticated journey per app launch (re-bootstrapping is costly),
with each step a self-contained feature check: open the entry from home →
act → assert on what the **live service** returned. Put reusable helpers
(`launchApp`, `loginAsNewUser`, `pumpUntilFound`, `tapAndSettle`, `openFromHome`,
`goBack`) in a `support/` file. Cover **every** feature: a create flow where the
UI doesn't need GPS/a second user, otherwise a navigate-and-load assert (which
still proves the screen renders live data).

- **`openFromHome` for deep list items:** reset the list to the top first (so a
  downward `scrollUntilVisible` can always reach the card regardless of prior
  scroll), and **tap the `Card`, not the title `Text`** (the `Text` sits behind
  the `ListTile`'s `InkWell` → hit-test miss).
- **`goBack` must handle non-standard backs:** screens may use a custom
  `IconButton(Icons.arrow_back)` (e.g. doing `context.go('/')`) instead of the
  auto `BackButton`. Try `BackButton`, then `Icons.arrow_back`, then
  `arrow_back_ios`. (Better: fix the screen to use the native back — see UX note.)

## Cross-user flows (seed the counterpart via the API)

For flows that act on **another user's** data (book their tool, order their
listing, apply to their job, respond to their alert), don't try to drive two UI
sessions. Mint a second user **over the API** (`apiCreateUser` → real OTP via the
dev endpoint), seed their data with an authed Dio client, then drive the UI as
the logged-in user and assert the cross-user result (e.g. the seeded tool appears
in the rental catalog). Watch the create DTOs — required fields a UI form fills
implicitly (e.g. `deposit_required`) must be in the seed payload too.

## Device permissions / location (GPS create flows)

On-device tests **can't dismiss native permission dialogs**, and
`simctl privacy grant location` is unreliable — `getCurrentPosition` then hangs.
**Mock the geolocation platform** instead (the robust approach): install a fake
`GeolocatorPlatform` that returns granted permission + a fixed position, before
launching the app. The create flow still POSTs to the **real backend**; only the
device GPS is faked (exactly what you'd do in CI). With mocktail:

```dart
class _MockGeo extends Mock with MockPlatformInterfaceMixin implements GeolocatorPlatform {}
// stub isLocationServiceEnabled → true, check/requestPermission → whileInUse,
// getCurrentPosition(any) → a fixed Position; then GeolocatorPlatform.instance = mock;
```

(`geolocator` re-exports its platform interface; add `plugin_platform_interface`
as a dev dep for `MockPlatformInterfaceMixin`.) This is the "mock the platform
APIs" pattern — same idea as mocking HTTP, but here the live backend is the point,
so mock only the device capability.

## Navigation gotcha (and a UX smell)

`goHome` (pop until home) breaks if a screen navigates back/after-create with an
**absolute `context.go('/x')`** to a route not nested under `/` — `go()` rebuilds
the stack and drops home, so there's no way back. Fix the screen to `pop()` /
`pushReplacement` with a native back button (better UX), and detect "home" by a
scroll-stable marker (e.g. a logout button), not a welcome text that scrolls off.

## UX: fix smells you hit while testing

When a test has to fight the layout to tap something, or a screen lacks a native
back affordance, that's a UX smell — **fix it if it's cheap** (e.g. replace a
custom `context.go('/')` leading with the native AppBar back button) and log the
rest to `mobile-ux-review` / the UX backlog.

## See also

- Community **`flutter-add-integration-test`** skill — project setup
  (`integration_test`/`flutter_test` deps, `Key`s, Flutter Driver, MCP-driven
  exploration). This skill assumes that setup and focuses on the **live-backend**
  specifics above.
- Flutter docs: <https://docs.flutter.dev/testing/integration-tests>.
