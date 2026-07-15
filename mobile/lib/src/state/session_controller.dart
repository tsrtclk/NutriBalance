import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/token_store.dart';

enum SessionStatus {
  /// Bootstrapping — splash.
  unknown,

  /// No (valid) token — login/register.
  unauthenticated,

  /// Logged in but GET /profile is 404 — onboarding (É1).
  needsOnboarding,

  /// Logged in with a profile — the app proper.
  authenticated,
}

/// Owns the auth lifecycle: where the user is in the journey and the
/// transitions between screens. Screens never touch tokens directly.
class SessionController extends ChangeNotifier {
  SessionController({required this.api, required this.tokens}) {
    api.onSessionExpired = _onSessionExpired;
  }

  final ApiClient api;
  final TokenStore tokens;

  SessionStatus _status = SessionStatus.unknown;
  SessionStatus get status => _status;

  /// On launch: token present → probe the profile; otherwise login.
  Future<void> bootstrap() async {
    if (await tokens.readAccess() == null) {
      _set(SessionStatus.unauthenticated);
      return;
    }
    await _probeProfile();
  }

  Future<void> login({required String email, required String password}) async {
    final data =
        await api.post(
              '/auth/login',
              body: {
                'email': email,
                'password': password,
                'device_id': 'mobile',
              },
            )
            as Map<String, dynamic>;
    await _storeTokens(data);
    await _probeProfile();
  }

  Future<void> register({
    required String fullName,
    required String email,
    required String password,
  }) async {
    final data =
        await api.post(
              '/auth/register',
              body: {
                'email': email,
                'password': password,
                'full_name': fullName,
                'device_id': 'mobile',
              },
            )
            as Map<String, dynamic>;
    await _storeTokens(data);
    // A fresh account never has a profile yet.
    _set(SessionStatus.needsOnboarding);
  }

  /// É1 onboarding — PUT /profile with the target-formula inputs.
  Future<void> completeOnboarding(Map<String, dynamic> profile) async {
    await api.put('/profile', body: profile);
    _set(SessionStatus.authenticated);
  }

  Future<void> logout() async {
    try {
      await api.post('/auth/logout');
    } on ApiException {
      // Best-effort: local logout must succeed even if the API call fails.
    }
    await tokens.clear();
    _set(SessionStatus.unauthenticated);
  }

  /// É12 RGPD — password-confirmed account deletion (D14). On success the
  /// server has wiped the account and blacklisted the session, so we drop
  /// the local tokens and fall back to login. A wrong password throws
  /// (INVALID_CREDENTIALS) and leaves the session intact.
  Future<void> deleteAccount(String password) async {
    await api.delete('/auth/account', body: {'password': password});
    await tokens.clear();
    _set(SessionStatus.unauthenticated);
  }

  Future<void> _probeProfile() async {
    try {
      await api.get('/profile');
      _set(SessionStatus.authenticated);
    } on ApiException catch (e) {
      if (e.code == 'PROFILE_NOT_FOUND') {
        _set(SessionStatus.needsOnboarding);
      } else if (e.status == 401) {
        await tokens.clear();
        _set(SessionStatus.unauthenticated);
      } else {
        rethrow;
      }
    }
  }

  Future<void> _storeTokens(Map<String, dynamic> authResponse) async {
    final t = authResponse['tokens'] as Map<String, dynamic>;
    await tokens.save(
      access: t['access_token'] as String,
      refresh: t['refresh_token'] as String,
    );
  }

  void _onSessionExpired() {
    if (_status == SessionStatus.unknown) return;
    tokens.clear();
    _set(SessionStatus.unauthenticated);
  }

  void _set(SessionStatus next) {
    if (_status == next) return;
    _status = next;
    notifyListeners();
  }
}
