import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'support/journey.dart';

/// The single authenticated journey, driven on a device against the live
/// compose stack (the UI counterpart of the Cucumber suite). Each step proves
/// a feature end-to-end: register → onboarding computes targets (É1) → the
/// dashboard shows the gamification state (É10).
///
/// Run against the stack:
///   `flutter test integration_test/ -d <device>`
///     `--dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1`
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('register → onboarding → dashboard', (tester) async {
    await launchApp(tester);

    // Step 1 — a fresh account lands on onboarding (É1/É2).
    await registerNewUser(tester);

    // Step 2 — completing the profile computes and shows daily targets.
    await tester.enterText(
      find.byKey(const Key('onboarding_birth_date')),
      '1996-03-14',
    );
    await tester.enterText(find.byKey(const Key('onboarding_height')), '180');
    await tester.enterText(find.byKey(const Key('onboarding_weight')), '80');
    await tester.ensureVisible(find.byKey(const Key('onboarding_submit')));
    await tester.tap(find.byKey(const Key('onboarding_submit')));

    // Step 3 — the dashboard renders the live targets + streaks (É1 + É10).
    await pumpUntilFound(tester, find.byKey(const Key('targets_kcal')));
    expect(find.byKey(const Key('streak_hydration')), findsOneWidget);
    expect(find.byKey(const Key('challenge_title')), findsOneWidget);

    // Step 4 — logging out returns to login.
    await tester.tap(find.byKey(const Key('dashboard_logout')));
    await pumpUntilFound(tester, find.byKey(const Key('login_submit')));
  });
}
