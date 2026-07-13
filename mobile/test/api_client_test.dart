import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:nutribalance_mobile/src/api/api_client.dart';
import 'package:nutribalance_mobile/src/api/token_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/fake_backend.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPrefsTokenStore tokens;

  ApiClient client(http.Client mock) => ApiClient(
    tokens: tokens,
    httpClient: mock,
    baseUrl: 'http://test/api/v1',
  );

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    tokens = SharedPrefsTokenStore();
  });

  test('unwraps the {success, data} envelope', () async {
    final api = client(
      fakeBackend({
        'GET /api/v1/profile': (_) => ok({'goal': 'lose'}),
      }),
    );
    final data = await api.get('/profile') as Map<String, dynamic>;
    expect(data['goal'], 'lose');
  });

  test(
    'surfaces the error envelope as an ApiException with its code',
    () async {
      final api = client(
        fakeBackend({
          'POST /api/v1/auth/login': (_) =>
              apiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
        }),
      );
      expect(
        () => api.post('/auth/login', body: {'email': 'x', 'password': 'y'}),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 'INVALID_CREDENTIALS')
              .having((e) => e.status, 'status', 401),
        ),
      );
    },
  );

  test('a 401 triggers one refresh, then replays the request', () async {
    await tokens.save(access: 'stale', refresh: 'refresh-0');
    var profileCalls = 0;
    var refreshCalls = 0;
    final api = client(
      fakeBackend({
        'GET /api/v1/profile': (request) {
          profileCalls++;
          final auth = request.headers['Authorization'] ?? '';
          if (auth != 'Bearer access-token-rotated') {
            return apiError(401, 'UNAUTHORIZED', 'expired');
          }
          return ok({'goal': 'maintain'});
        },
        'POST /api/v1/auth/refresh': (request) {
          refreshCalls++;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['refresh_token'], 'refresh-0');
          return ok(tokensJson(suffix: '-rotated'));
        },
      }),
    );

    final data = await api.get('/profile') as Map<String, dynamic>;
    expect(data['goal'], 'maintain');
    expect(profileCalls, 2);
    expect(refreshCalls, 1);
    expect(await tokens.readAccess(), 'access-token-rotated');
  });

  test(
    'a failed refresh clears tokens and reports the expired session',
    () async {
      await tokens.save(access: 'stale', refresh: 'dead');
      var expired = false;
      final api = client(
        fakeBackend({
          'GET /api/v1/profile': (_) =>
              apiError(401, 'UNAUTHORIZED', 'expired'),
          'POST /api/v1/auth/refresh': (_) =>
              apiError(401, 'INVALID_REFRESH_TOKEN', 'rotated out'),
        }),
      );
      api.onSessionExpired = () => expired = true;

      await expectLater(
        () => api.get('/profile'),
        throwsA(isA<ApiException>().having((e) => e.status, 'status', 401)),
      );
      expect(expired, isTrue);
      expect(await tokens.readAccess(), isNull);
    },
  );

  test('a non-JSON body becomes a BAD_RESPONSE ApiException', () async {
    final api = client(MockClientAdapter());
    expect(
      () => api.get('/profile'),
      throwsA(
        isA<ApiException>().having((e) => e.code, 'code', 'BAD_RESPONSE'),
      ),
    );
  });
}

/// A client that answers plain text (a gateway 502 page, say).
class MockClientAdapter extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    return http.StreamedResponse(Stream.value('Bad Gateway'.codeUnits), 502);
  }
}
