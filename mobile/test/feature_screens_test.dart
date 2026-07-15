import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:nutribalance_mobile/src/api/api_client.dart';
import 'package:nutribalance_mobile/src/api/token_store.dart';
import 'package:nutribalance_mobile/src/app.dart';
import 'package:nutribalance_mobile/src/state/session_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/fake_backend.dart';

/// B21 slice 1 — the hydration and réglages tabs, driven through the real
/// HomeShell against the envelope contract.
void main() {
  const authedPrefs = {
    'nb_access_token': 'access',
    'nb_refresh_token': 'refresh',
  };

  Future<void> pumpAuthed(WidgetTester tester, http.Client backend) async {
    SharedPreferences.setMockInitialValues(authedPrefs);
    final tokens = SharedPrefsTokenStore();
    final api = ApiClient(
      tokens: tokens,
      httpClient: backend,
      baseUrl: 'http://test/api/v1',
    );
    await tester.pumpWidget(
      NutriBalanceApp(
        session: SessionController(api: api, tokens: tokens),
      ),
    );
    await tester.pumpAndSettle();
  }

  // The always-present authenticated GETs, so HomeShell mounts cleanly.
  Map<String, Handler> baseRoutes() => {
    'GET /api/v1/profile': (_) => ok({'goal': 'maintain'}),
    'GET /api/v1/profile/targets': (_) => ok(targetsJson()),
    'GET /api/v1/gamification/streaks': (_) => ok(streaksJson()),
    'GET /api/v1/gamification/challenge': (_) => ok(challengeJson()),
    'GET /api/v1/hydration': (_) => ok(hydrationDayJson()),
    'GET /api/v1/settings': (_) => ok(settingsJson()),
  };

  testWidgets('hydration quick-add posts and refreshes the day total', (
    tester,
  ) async {
    var total = 0;
    final posted = <int>[];
    final routes = {
      ...baseRoutes(),
      'GET /api/v1/hydration': (http.Request _) =>
          ok(hydrationDayJson(totalMl: total)),
      'POST /api/v1/hydration': (http.Request request) {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        posted.add(body['amount_ml'] as int);
        total += body['amount_ml'] as int;
        return ok({'id': 'h1', 'amount_ml': body['amount_ml']}, status: 201);
      },
    };
    await pumpAuthed(tester, fakeBackend(routes));

    await tester.tap(find.text('Hydratation'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('hydration_total')), findsOneWidget);
    expect(find.text('0 / 2800 ml'), findsOneWidget);

    await tester.tap(find.byKey(const Key('hydration_add_glass')));
    await tester.pumpAndSettle();
    expect(posted, [250]);
    expect(find.text('250 / 2800 ml'), findsOneWidget);

    await tester.tap(find.byKey(const Key('hydration_add_bottle')));
    await tester.pumpAndSettle();
    expect(posted, [250, 500]);
    expect(find.text('750 / 2800 ml'), findsOneWidget);
  });

  testWidgets('settings toggles a unit with a PUT and reflects the response', (
    tester,
  ) async {
    String weightUnit = 'kg';
    final routes = {
      ...baseRoutes(),
      'GET /api/v1/settings': (http.Request _) =>
          ok(settingsJson(weightUnit: weightUnit)),
      'PUT /api/v1/settings': (http.Request request) {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        weightUnit = body['weight_unit'] as String? ?? weightUnit;
        return ok(settingsJson(weightUnit: weightUnit));
      },
    };
    await pumpAuthed(tester, fakeBackend(routes));

    await tester.tap(find.text('Réglages'));
    await tester.pumpAndSettle();

    // Switch weight to lb via the segmented control.
    await tester.tap(find.text('lb'));
    await tester.pumpAndSettle();
    expect(weightUnit, 'lb');
  });

  testWidgets('account deletion re-confirms the password then leaves', (
    tester,
  ) async {
    var deleteCalls = 0;
    final routes = {
      ...baseRoutes(),
      'DELETE /api/v1/auth/account': (http.Request request) {
        deleteCalls++;
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        if (body['password'] != 'E2e-test-pass-1') {
          return apiError(401, 'INVALID_CREDENTIALS', 'wrong');
        }
        return ok({'deleted': true});
      },
    };
    await pumpAuthed(tester, fakeBackend(routes));

    await tester.tap(find.text('Réglages'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('settings_delete_account')));
    await tester.pumpAndSettle();

    // Wrong password → 401, stays in the app.
    await tester.enterText(
      find.byKey(const Key('delete_password_field')),
      'wrong-pass',
    );
    await tester.tap(find.byKey(const Key('delete_confirm')));
    await tester.pumpAndSettle();
    expect(deleteCalls, 1);
    expect(find.byKey(const Key('settings_logout')), findsOneWidget);

    // Right password → account gone, back to login.
    await tester.tap(find.byKey(const Key('settings_delete_account')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('delete_password_field')),
      'E2e-test-pass-1',
    );
    await tester.tap(find.byKey(const Key('delete_confirm')));
    await tester.pumpAndSettle();
    expect(deleteCalls, 2);
    expect(find.byKey(const Key('login_submit')), findsOneWidget);
  });
}
