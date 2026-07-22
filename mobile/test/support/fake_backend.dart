import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// Canned `{success, data}` / `{success, error}` envelopes matching the
/// platform's TransformInterceptor / HttpExceptionFilter contract.
http.Response ok(Object? data, {int status = 200}) => http.Response(
  jsonEncode({'success': true, 'data': data}),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response apiError(int status, String code, String message) =>
    http.Response(
      jsonEncode({
        'success': false,
        'error': {'code': code, 'message': message},
      }),
      status,
      headers: {'content-type': 'application/json'},
    );

Map<String, dynamic> tokensJson({String suffix = ''}) => {
  'access_token': 'access-token$suffix',
  'refresh_token': 'refresh-token$suffix',
  'token_type': 'Bearer',
  'expires_in': 900,
};

Map<String, dynamic> authResponseJson() => {
  'user': {
    'id': '00000000-0000-4000-8000-000000000001',
    'email': 'test@nutribalance.test',
    'full_name': 'Test User',
    'locale': 'fr',
    'auth_level': 1,
  },
  'tokens': tokensJson(),
};

Map<String, dynamic> targetsJson() => {
  'bmr_kcal': 1780,
  'tdee_kcal': 2759,
  'calories_kcal': 2759,
  'protein_g': 144,
  'carbs_g': 359,
  'fat_g': 77,
  'water_ml': 2800,
  'weekly_rate_kg': 0,
};

Map<String, dynamic> streaksJson({int hydrationCurrent = 2}) => {
  'journal': {'current': 0, 'best': 0, 'last_day': null, 'events_total': 0},
  'workout': {'current': 1, 'best': 3, 'last_day': null, 'events_total': 4},
  'hydration': {
    'current': hydrationCurrent,
    'best': 5,
    'last_day': null,
    'events_total': 9,
  },
  'supplement': {'current': 0, 'best': 0, 'last_day': null, 'events_total': 0},
};

Map<String, dynamic> hydrationDayJson({int totalMl = 0}) => {
  'date': '2026-07-13',
  'total_ml': totalMl,
  'entries': <dynamic>[],
};

Map<String, dynamic> journalDayJson({
  Map<String, List<Map<String, dynamic>>> meals = const {},
  int totalKcal = 0,
}) => {
  'date': '2026-07-13',
  'meals': meals,
  'totals': {'kcal': totalKcal, 'protein_g': 0, 'carbs_g': 0, 'fat_g': 0},
};

Map<String, dynamic> foodJson({
  String id = 'food-1',
  String name = 'Banane',
  int kcal = 89,
}) => {
  'id': id,
  'source': 'off',
  'off_barcode': null,
  'owner_id': null,
  'name': name,
  'brand': null,
  'kcal_per_100g': kcal,
  'protein_per_100g': 1,
  'carbs_per_100g': 23,
  'fat_per_100g': 0,
  'serving_size_g': null,
};

Map<String, dynamic> settingsJson({
  String weightUnit = 'kg',
  String heightUnit = 'cm',
}) => {'weight_unit': weightUnit, 'height_unit': heightUnit};

Map<String, dynamic> challengeJson({int progress = 1}) => {
  'week_start': '2026-07-13',
  'code': 'hydration_days_5',
  'title': 'Hydratez-vous 5 jours cette semaine',
  'kind': 'hydration',
  'metric': 'days',
  'target': 5,
  'progress': progress,
  'completed': false,
};

typedef Handler = http.Response Function(http.Request request);

/// A backend as a `"METHOD /path" → handler` table. Handlers can close over
/// mutable state to model transitions (e.g. /profile 404s until it is PUT).
MockClient fakeBackend(Map<String, Handler> routes) {
  return MockClient((request) async {
    final key = '${request.method} ${request.url.path}';
    final handler = routes[key];
    if (handler == null) {
      return apiError(404, 'NO_ROUTE', 'unrouted in test: $key');
    }
    return handler(request);
  });
}
