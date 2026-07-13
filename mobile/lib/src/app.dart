import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/auth_gate.dart';
import 'state/session_controller.dart';

class NutriBalanceApp extends StatelessWidget {
  const NutriBalanceApp({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: session,
      child: MaterialApp(
        title: 'NutriBalance',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2E7D32)),
          useMaterial3: true,
        ),
        home: const AuthGate(),
      ),
    );
  }
}
