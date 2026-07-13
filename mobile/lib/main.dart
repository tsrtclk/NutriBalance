import 'package:flutter/material.dart';

import 'src/api/api_client.dart';
import 'src/api/token_store.dart';
import 'src/app.dart';
import 'src/state/session_controller.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final tokens = SharedPrefsTokenStore();
  final api = ApiClient(tokens: tokens);
  runApp(
    NutriBalanceApp(
      session: SessionController(api: api, tokens: tokens),
    ),
  );
}
