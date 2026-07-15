import 'dart:convert';

import 'package:http/http.dart' as http;

import 'token_store.dart';

/// Kong gateway base. Override per target:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
/// (Android emulator reaches the host at 10.0.2.2, iOS simulator at localhost.)
const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:8000/api/v1',
);

/// The backend's error envelope, surfaced with its stable `code`
/// (INVALID_CREDENTIALS, PROFILE_NOT_FOUND, EMAIL_TAKEN, …).
class ApiException implements Exception {
  ApiException({
    required this.status,
    required this.code,
    required this.message,
  });

  final int status;
  final String code;
  final String message;

  @override
  String toString() => 'ApiException($status $code): $message';
}

/// Thin JSON client over the platform's `{success, data} | {success, error}`
/// envelope. Attaches the bearer token and transparently retries a request
/// once after a 401 by rotating the refresh token (the backend invalidates
/// replayed refresh tokens, so a second failure means the session is dead).
class ApiClient {
  ApiClient({
    required this.tokens,
    http.Client? httpClient,
    this.baseUrl = apiBaseUrl,
  }) : _http = httpClient ?? http.Client();

  final TokenStore tokens;
  final String baseUrl;
  final http.Client _http;

  /// Called when a refresh fails — the session controller logs out on it.
  void Function()? onSessionExpired;

  Future<dynamic> get(String path) => _send('GET', path);
  Future<dynamic> post(String path, {Object? body}) =>
      _send('POST', path, body: body);
  Future<dynamic> put(String path, {Object? body}) =>
      _send('PUT', path, body: body);
  Future<dynamic> delete(String path, {Object? body}) =>
      _send('DELETE', path, body: body);

  Future<dynamic> _send(
    String method,
    String path, {
    Object? body,
    bool retried = false,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    final access = await tokens.readAccess();
    if (access != null) headers['Authorization'] = 'Bearer $access';

    final request = http.Request(method, Uri.parse('$baseUrl$path'))
      ..headers.addAll(headers);
    if (body != null) request.body = jsonEncode(body);

    final response = await http.Response.fromStream(await _http.send(request));

    // Only a generic guard rejection (an expired/blacklisted access token,
    // code UNAUTHORIZED) is worth a refresh-and-replay. A business 401 with a
    // specific code — e.g. INVALID_CREDENTIALS from a password re-confirm on
    // account deletion — must surface as-is; refreshing the token would not
    // fix it and would wrongly log the user out if the refresh then failed.
    if (response.statusCode == 401 &&
        !retried &&
        access != null &&
        _errorCode(response) == 'UNAUTHORIZED') {
      if (await _tryRefresh()) {
        return _send(method, path, body: body, retried: true);
      }
      onSessionExpired?.call();
    }
    return _decode(response);
  }

  String? _errorCode(http.Response response) {
    try {
      final error = _envelope(response)['error'] as Map<String, dynamic>?;
      return error?['code'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<bool> _tryRefresh() async {
    final refresh = await tokens.readRefresh();
    if (refresh == null) return false;
    final response = await _http.post(
      Uri.parse('$baseUrl/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': refresh}),
    );
    if (response.statusCode != 200) {
      await tokens.clear();
      return false;
    }
    final data = _envelope(response)['data'] as Map<String, dynamic>;
    await tokens.save(
      access: data['access_token'] as String,
      refresh: data['refresh_token'] as String,
    );
    return true;
  }

  dynamic _decode(http.Response response) {
    final envelope = _envelope(response);
    if (response.statusCode >= 200 &&
        response.statusCode < 300 &&
        envelope['success'] == true) {
      return envelope['data'];
    }
    final error = (envelope['error'] as Map<String, dynamic>?) ?? const {};
    throw ApiException(
      status: response.statusCode,
      code: (error['code'] as String?) ?? 'UNKNOWN',
      message:
          (error['message'] as String?) ?? 'Une erreur inattendue est survenue',
    );
  }

  Map<String, dynamic> _envelope(http.Response response) {
    try {
      return jsonDecode(utf8.decode(response.bodyBytes))
          as Map<String, dynamic>;
    } catch (_) {
      throw ApiException(
        status: response.statusCode,
        code: 'BAD_RESPONSE',
        message: 'Réponse illisible du serveur (${response.statusCode})',
      );
    }
  }
}
