import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/session_controller.dart';
import 'dashboard_screen.dart';
import 'login_screen.dart';
import 'onboarding_screen.dart';

/// Routes the whole app off the session status — pushing/popping is only
/// used *inside* a status (e.g. login → register), so auth transitions can
/// never leave a stale stack behind.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  @override
  void initState() {
    super.initState();
    // Fire the bootstrap probe once the first frame is scheduled.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SessionController>().bootstrap();
    });
  }

  @override
  Widget build(BuildContext context) {
    final status = context.watch<SessionController>().status;
    return switch (status) {
      SessionStatus.unknown => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      SessionStatus.unauthenticated => const LoginScreen(),
      SessionStatus.needsOnboarding => const OnboardingScreen(),
      SessionStatus.authenticated => const DashboardScreen(),
    };
  }
}
