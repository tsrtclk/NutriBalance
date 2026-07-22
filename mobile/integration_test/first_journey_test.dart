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

    // Step 4 — the Journal tab reads the live day (É3); the empty state shows
    // before anything is logged. (The full search→log flow needs the mock
    // food provider's known results — covered by the widget tests.)
    await tester.tap(find.text('Journal'));
    await pumpUntilFound(tester, find.byKey(const Key('journal_total')));

    // Step 5 — the Hydratation tab logs water against the live service (É4),
    // which in turn feeds the hydration streak through the bus (É10).
    await tester.tap(find.text('Hydratation'));
    await pumpUntilFound(tester, find.byKey(const Key('hydration_total')));
    await tester.tap(find.byKey(const Key('hydration_add_glass')));
    await pumpUntilFound(tester, find.textContaining('250'));

    // Step 6 — the Réglages tab reads the live settings (É12); logout leaves.
    await tester.tap(find.text('Réglages'));
    await pumpUntilFound(tester, find.byKey(const Key('settings_logout')));
    await tester.tap(find.byKey(const Key('settings_logout')));
    await pumpUntilFound(tester, find.byKey(const Key('login_submit')));
  });
}
