# NutriBalance — mobile (Flutter)

The app shell and the first authenticated journey (backlog: B12). Talks to the
platform through the Kong gateway using the same `{success, data}` /
`{success, error}` envelope the services speak.

## Layout

```
lib/
  main.dart                 composition root (token store → API client → session)
  src/
    api/
      api_client.dart        envelope-aware JSON client; attaches the bearer
                             token, refreshes once on a 401 and replays
      token_store.dart       JWT persistence (shared_preferences; → secure
                             storage before release, backlog B20)
    state/
      session_controller.dart  the auth lifecycle: unauth → onboarding → app
    models/models.dart        read models (targets, streaks, challenge,
                             hydration day, journal day, food, settings)
    widgets/error_snackbar.dart  the one error→copy surface (U2)
    screens/                  login · register · onboarding (É1) · home_shell
                             (bottom nav) → dashboard · journal (É3, w/
                             food_search) · hydration (É4) ·
                             settings (É12: units + logout + RGPD delete)
    app.dart                  MaterialApp + the status-driven AuthGate
test/                        widget + client tests (offline, mocked backend)
integration_test/            on-device journey against the live compose stack
```

## Run

Point the app at the gateway with `--dart-define` (defaults to
`http://localhost:8000/api/v1`). The Android emulator reaches the host at
`10.0.2.2`, the iOS simulator at `localhost`:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

## Test

```bash
flutter analyze
flutter test                                   # widget + client tests (no backend)
flutter test integration_test/ -d <device> \   # on-device journey, needs the stack
  --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

`flutter analyze` + `flutter test` run in CI on every push (the `mobile` job).
The `integration_test/` journey needs an emulator and the running compose stack
(`docker compose -f infra/docker/docker-compose.yml up`), so it runs on demand —
it's the UI counterpart of the Cucumber suite (see the `flutter-integration-testing`
skill).
