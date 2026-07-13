import 'package:shared_preferences/shared_preferences.dart';

/// Persists the JWT pair between launches.
///
/// backlog: B20 — shared_preferences is plaintext on disk; move to
/// flutter_secure_storage (Keychain/Keystore) before a store release.
abstract class TokenStore {
  Future<String?> readAccess();
  Future<String?> readRefresh();
  Future<void> save({required String access, required String refresh});
  Future<void> clear();
}

class SharedPrefsTokenStore implements TokenStore {
  static const _accessKey = 'nb_access_token';
  static const _refreshKey = 'nb_refresh_token';

  @override
  Future<String?> readAccess() async =>
      (await SharedPreferences.getInstance()).getString(_accessKey);

  @override
  Future<String?> readRefresh() async =>
      (await SharedPreferences.getInstance()).getString(_refreshKey);

  @override
  Future<void> save({required String access, required String refresh}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessKey, access);
    await prefs.setString(_refreshKey, refresh);
  }

  @override
  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessKey);
    await prefs.remove(_refreshKey);
  }
}
