import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:nutribalance_mobile/src/api/api_client.dart';
import 'package:nutribalance_mobile/src/api/token_store.dart';
import 'package:nutribalance_mobile/src/app.dart';
import 'package:nutribalance_mobile/src/state/session_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/fake_backend.dart';

/// The widget-level twin of the future on-device journey (see the
/// flutter-integration-testing skill): register → onboarding → dashboard,
/// against the same envelope contract the live gateway speaks.
void main() {
  Future<SessionController> pumpApp(
    WidgetTester tester,
    http.Client backend, {
    Map<String, Object> initialPrefs = const {},
  }) async {
    SharedPreferences.setMockInitialValues(initialPrefs);
    final tokens = SharedPrefsTokenStore();
    final api = ApiClient(
      tokens: tokens,
      httpClient: backend,
      baseUrl: 'http://test/api/v1',
    );
    final session = SessionController(api: api, tokens: tokens);
    await tester.pumpWidget(NutriBalanceApp(session: session));
    await tester.pumpAndSettle();
    return session;
  }

  testWidgets('boots to the login screen when no session is stored', (
    tester,
  ) async {
    await pumpApp(tester, fakeBackend({}));
    expect(find.byKey(const Key('login_submit')), findsOneWidget);
  });

  testWidgets('bad credentials surface a French error and stay on login', (
    tester,
  ) async {
    await pumpApp(
      tester,
      fakeBackend({
        'POST /api/v1/auth/login': (_) =>
            apiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
      }),
    );
    await tester.enterText(
      find.byKey(const Key('login_email')),
      'alice@test.fr',
    );
    await tester.enterText(
      find.byKey(const Key('login_password')),
      'wrong-password',
    );
    await tester.tap(find.byKey(const Key('login_submit')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login_error')), findsOneWidget);
    expect(find.text('E-mail ou mot de passe incorrect'), findsOneWidget);
  });

  testWidgets(
    'register → onboarding → dashboard: the first authenticated journey',
    (tester) async {
      var profileStored = false;
      final backend = fakeBackend({
        'POST /api/v1/auth/register': (_) =>
            ok(authResponseJson(), status: 201),
        'GET /api/v1/profile': (_) => profileStored
            ? ok({'goal': 'maintain'})
            : apiError(404, 'PROFILE_NOT_FOUND', 'complete onboarding first'),
        'PUT /api/v1/profile': (_) {
          profileStored = true;
          return ok({'goal': 'maintain'});
        },
        'GET /api/v1/profile/targets': (_) => ok(targetsJson()),
        'GET /api/v1/gamification/streaks': (_) => ok(streaksJson()),
        'GET /api/v1/gamification/challenge': (_) => ok(challengeJson()),
        // HomeShell mounts every tab, so hydration + settings load too.
        'GET /api/v1/hydration': (_) => ok(hydrationDayJson()),
        'GET /api/v1/settings': (_) => ok(settingsJson()),
      });
      await pumpApp(tester, backend);

      // Login → register.
      await tester.tap(find.byKey(const Key('login_to_register')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('register_name')),
        'Alice Test',
      );
      await tester.enterText(
        find.byKey(const Key('register_email')),
        'alice@test.fr',
      );
      await tester.enterText(
        find.byKey(const Key('register_password')),
        'E2e-test-pass-1',
      );
      await tester.tap(find.byKey(const Key('register_submit')));
      await tester.pumpAndSettle();

      // Fresh account → onboarding form.
      expect(find.byKey(const Key('onboarding_submit')), findsOneWidget);
      await tester.enterText(
        find.byKey(const Key('onboarding_birth_date')),
        '1996-03-14',
      );
      await tester.enterText(find.byKey(const Key('onboarding_height')), '180');
      await tester.enterText(find.byKey(const Key('onboarding_weight')), '80');
      // The form is taller than the test viewport — bring the button in.
      await tester.ensureVisible(find.byKey(const Key('onboarding_submit')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('onboarding_submit')));
      await tester.pumpAndSettle();

      // Dashboard shows the computed targets and the gamification state.
      expect(find.byKey(const Key('targets_kcal')), findsOneWidget);
      expect(find.text('2759 kcal'), findsOneWidget);
      expect(find.text('Hydratation : 2 j'), findsOneWidget);
      expect(find.text('Hydratez-vous 5 jours cette semaine'), findsOneWidget);
    },
  );

  testWidgets('an onboarding form full of holes never calls the API', (
    tester,
  ) async {
    var putCalls = 0;
    await pumpApp(
      tester,
      fakeBackend({
        'GET /api/v1/profile': (_) =>
            apiError(404, 'PROFILE_NOT_FOUND', 'complete onboarding first'),
        'PUT /api/v1/profile': (_) {
          putCalls++;
          return ok({'goal': 'maintain'});
        },
      }),
      initialPrefs: {
        'nb_access_token': 'access',
        'nb_refresh_token': 'refresh',
      },
    );
    expect(find.byKey(const Key('onboarding_submit')), findsOneWidget);

    // Empty form → validators block the call.
    await tester.ensureVisible(find.byKey(const Key('onboarding_submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('onboarding_submit')));
    await tester.pumpAndSettle();
    expect(putCalls, 0);
    expect(find.text('Format AAAA-MM-JJ'), findsOneWidget);
  });

  testWidgets(
    'a stored session boots to the dashboard; logout from Réglages leaves',
    (tester) async {
      final backend = fakeBackend({
        'GET /api/v1/profile': (_) => ok({'goal': 'maintain'}),
        'GET /api/v1/profile/targets': (_) => ok(targetsJson()),
        'GET /api/v1/gamification/streaks': (_) => ok(streaksJson()),
        'GET /api/v1/gamification/challenge': (_) => ok(challengeJson()),
        'GET /api/v1/hydration': (_) => ok(hydrationDayJson()),
        'GET /api/v1/settings': (_) => ok(settingsJson()),
        'POST /api/v1/auth/logout': (_) => ok({'ok': true}),
      });
      await pumpApp(
        tester,
        backend,
        initialPrefs: {
          'nb_access_token': 'access',
          'nb_refresh_token': 'refresh',
        },
      );

      expect(find.byKey(const Key('targets_kcal')), findsOneWidget);
      // Logout now lives in the Réglages tab (U3 — dashboard is not a dead end).
      await tester.tap(find.text('Réglages'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('settings_logout')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('login_submit')), findsOneWidget);
    },
  );
}
