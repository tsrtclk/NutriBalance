import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nutribalance_mobile/src/api/api_client.dart';
import 'package:nutribalance_mobile/src/api/token_store.dart';
import 'package:nutribalance_mobile/src/app.dart';
import 'package:nutribalance_mobile/src/state/session_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Shared helpers for the on-device journey (see the flutter-integration-testing
/// skill). The app is pointed at the live gateway with
///   --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1   (Android emulator)
/// Each run registers a brand-new user so runs are isolated.

/// A unique e-mail per run — the on-device equivalent of the e2e `uniqueEmail`.
String uniqueEmail() {
  final n = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
  return 'e2e-mobile-$n@nutribalance.test';
}

/// Launch the app on a clean session (device storage persists between runs, so
/// always clear it — otherwise the app boots past login).
Future<void> launchApp(WidgetTester tester) async {
  SharedPreferences.setMockInitialValues({});
  final tokens = SharedPrefsTokenStore();
  await tokens.clear();
  final api = ApiClient(tokens: tokens);
  await tester.pumpWidget(
    NutriBalanceApp(
      session: SessionController(api: api, tokens: tokens),
    ),
  );
  await tester.pumpAndSettle();
}

/// Network-driven content schedules no frames, so `pumpAndSettle` returns
/// early — poll by pumping in a loop until the finder matches.
Future<void> pumpUntilFound(
  WidgetTester tester,
  Finder finder, {
  Duration timeout = const Duration(seconds: 15),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 200));
    if (finder.evaluate().isNotEmpty) return;
  }
  throw StateError('timed out waiting for $finder');
}

/// Register a fresh user through the real UI — the journey's stand-in for a
/// completed sign-up.
Future<void> registerNewUser(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('login_to_register')));
  await tester.pumpAndSettle();
  await tester.enterText(find.byKey(const Key('register_name')), 'E2E Mobile');
  await tester.enterText(
    find.byKey(const Key('register_email')),
    uniqueEmail(),
  );
  await tester.enterText(
    find.byKey(const Key('register_password')),
    'E2e-test-pass-1',
  );
  await tester.tap(find.byKey(const Key('register_submit')));
  await pumpUntilFound(tester, find.byKey(const Key('onboarding_submit')));
}
