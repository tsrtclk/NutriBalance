import 'package:flutter/material.dart';

import '../api/api_client.dart';

/// U2 — the one place errors become user-facing copy. Screens call this
/// instead of each rolling their own inline `Text`, so the message + retry
/// affordance stay consistent as screens multiply (backlog: B21).
///
/// Known `ApiException.code`s get friendly French copy; anything else falls
/// back to the server message.
const _friendly = <String, String>{
  'INVALID_CREDENTIALS': 'E-mail ou mot de passe incorrect',
  'EMAIL_TAKEN': 'Un compte existe déjà avec cet e-mail',
  'PROFILE_NOT_FOUND': 'Complétez votre profil pour continuer',
  'SUPPLEMENT_INACTIVE': 'Ce complément a été désactivé',
  'RATE_LIMITED': 'Trop de requêtes — réessayez dans un instant',
};

String messageForError(Object error) {
  if (error is ApiException) {
    return _friendly[error.code] ?? error.message;
  }
  return 'Une erreur inattendue est survenue';
}

void showApiError(BuildContext context, Object error, {VoidCallback? onRetry}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.clearSnackBars();
  messenger.showSnackBar(
    SnackBar(
      content: Text(messageForError(error)),
      action: onRetry == null
          ? null
          : SnackBarAction(label: 'Réessayer', onPressed: onRetry),
    ),
  );
}
