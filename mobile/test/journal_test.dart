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

/// B21 slice 2 — the Journal tab (É3): day view, and the search → portion →
/// log flow, driven through the real HomeShell against the envelope contract.
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

  Map<String, Handler> baseRoutes() => {
    'GET /api/v1/profile': (_) => ok({'goal': 'maintain'}),
    'GET /api/v1/profile/targets': (_) => ok(targetsJson()),
    'GET /api/v1/gamification/streaks': (_) => ok(streaksJson()),
    'GET /api/v1/gamification/challenge': (_) => ok(challengeJson()),
    'GET /api/v1/hydration': (_) => ok(hydrationDayJson()),
    'GET /api/v1/settings': (_) => ok(settingsJson()),
  };

  testWidgets('empty journal shows the prompt and the target', (tester) async {
    final routes = {
      ...baseRoutes(),
      'GET /api/v1/journal': (http.Request _) => ok(journalDayJson()),
    };
    await pumpAuthed(tester, fakeBackend(routes));

    await tester.tap(find.text('Journal'));
    await tester.pumpAndSettle();
    expect(find.text('0 / 2759 kcal'), findsOneWidget);
    expect(find.byKey(const Key('journal_empty')), findsOneWidget);
  });

  testWidgets('search a food, log a portion, and the journal reloads', (
    tester,
  ) async {
    var logged = false;
    final posted = <Map<String, dynamic>>[];
    final routes = {
      ...baseRoutes(),
      'GET /api/v1/journal': (http.Request _) => logged
          ? ok(
              journalDayJson(
                totalKcal: 89,
                meals: {
                  'breakfast': [
                    {
                      'id': 'j1',
                      'food_name': 'Banane',
                      'quantity_g': 100,
                      'kcal': 89,
                    },
                  ],
                },
              ),
            )
          : ok(journalDayJson()),
      'GET /api/v1/foods/search': (http.Request _) =>
          ok([foodJson(id: 'food-1', name: 'Banane', kcal: 89)]),
      'POST /api/v1/journal': (http.Request request) {
        posted.add(jsonDecode(request.body) as Map<String, dynamic>);
        logged = true;
        return ok({'id': 'j1', 'food_name': 'Banane'}, status: 201);
      },
    };
    await pumpAuthed(tester, fakeBackend(routes));

    await tester.tap(find.text('Journal'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('journal_empty')), findsOneWidget);

    // Open the food-search flow.
    await tester.tap(find.byKey(const Key('journal_add')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('food_search_field')),
      'banane',
    );
    await tester.tap(find.byKey(const Key('food_search_button')));
    await tester.pumpAndSettle();

    // Pick the result → portion dialog → log.
    await tester.tap(find.byKey(const Key('food_result_food-1')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('portion_quantity')), '100');
    await tester.tap(find.byKey(const Key('portion_submit')));
    await tester.pumpAndSettle();

    // Back on the journal, reloaded with the new entry.
    expect(posted.single['food_item_id'], 'food-1');
    expect(posted.single['meal'], 'breakfast');
    expect(find.text('0 / 2759 kcal'), findsNothing);
    expect(find.text('89 / 2759 kcal'), findsOneWidget);
    expect(find.text('Banane'), findsOneWidget);
    expect(find.text('Petit-déjeuner'), findsOneWidget);
  });

  testWidgets('an invalid portion is rejected before any POST', (tester) async {
    var postCalls = 0;
    final routes = {
      ...baseRoutes(),
      'GET /api/v1/journal': (http.Request _) => ok(journalDayJson()),
      'GET /api/v1/foods/search': (http.Request _) =>
          ok([foodJson(id: 'food-1', name: 'Banane')]),
      'POST /api/v1/journal': (http.Request _) {
        postCalls++;
        return ok({'id': 'j1'}, status: 201);
      },
    };
    await pumpAuthed(tester, fakeBackend(routes));

    await tester.tap(find.text('Journal'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('journal_add')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('food_search_field')),
      'banane',
    );
    await tester.tap(find.byKey(const Key('food_search_button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('food_result_food-1')));
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const Key('portion_quantity')), '0');
    await tester.tap(find.byKey(const Key('portion_submit')));
    await tester.pumpAndSettle();
    expect(postCalls, 0);
    expect(find.text('Entre 1 et 5000 g'), findsOneWidget);
  });
}
