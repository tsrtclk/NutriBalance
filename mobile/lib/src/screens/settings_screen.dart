import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../state/session_controller.dart';
import '../widgets/error_snackbar.dart';

/// É12 réglages — display units (D13), session, and RGPD account deletion
/// (D14). The API stays metric; toggling a unit only changes how clients
/// render.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  UserSettings? _settings;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final api = context.read<SessionController>().api;
    try {
      final data = await api.get('/settings') as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _settings = UserSettings.fromJson(data);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showApiError(context, e, onRetry: _load);
    }
  }

  Future<void> _patch(Map<String, dynamic> patch) async {
    final api = context.read<SessionController>().api;
    try {
      final data =
          await api.put('/settings', body: patch) as Map<String, dynamic>;
      if (mounted) setState(() => _settings = UserSettings.fromJson(data));
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = _settings;
    return Scaffold(
      appBar: AppBar(title: const Text('Réglages')),
      body: _loading || settings == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                const _SectionHeader('Unités'),
                ListTile(
                  title: const Text('Poids'),
                  trailing: SegmentedButton<String>(
                    key: const Key('settings_weight_unit'),
                    segments: const [
                      ButtonSegment(value: 'kg', label: Text('kg')),
                      ButtonSegment(value: 'lb', label: Text('lb')),
                    ],
                    selected: {settings.weightUnit},
                    onSelectionChanged: (s) => _patch({'weight_unit': s.first}),
                  ),
                ),
                ListTile(
                  title: const Text('Taille'),
                  trailing: SegmentedButton<String>(
                    key: const Key('settings_height_unit'),
                    segments: const [
                      ButtonSegment(value: 'cm', label: Text('cm')),
                      ButtonSegment(value: 'in', label: Text('in')),
                    ],
                    selected: {settings.heightUnit},
                    onSelectionChanged: (s) => _patch({'height_unit': s.first}),
                  ),
                ),
                const Divider(),
                const _SectionHeader('Compte'),
                ListTile(
                  key: const Key('settings_logout'),
                  leading: const Icon(Icons.logout),
                  title: const Text('Se déconnecter'),
                  onTap: () => context.read<SessionController>().logout(),
                ),
                ListTile(
                  key: const Key('settings_delete_account'),
                  leading: Icon(
                    Icons.delete_forever,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  title: Text(
                    'Supprimer mon compte',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                  subtitle: const Text(
                    'Efface définitivement toutes vos données',
                  ),
                  onTap: _confirmDelete,
                ),
              ],
            ),
    );
  }

  Future<void> _confirmDelete() async {
    final password = await showDialog<String>(
      context: context,
      builder: (_) => const _DeleteAccountDialog(),
    );
    if (password == null || !mounted) return;
    try {
      await context.read<SessionController>().deleteAccount(password);
      // On success the session controller flips to unauthenticated and the
      // AuthGate swaps in the login screen — nothing more to do here.
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Theme.of(context).colorScheme.primary,
          letterSpacing: 1,
        ),
      ),
    );
  }
}

/// RGPD deletion re-confirms the password (D14) — a destructive action must
/// not be one tap away.
class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog();

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    if (_controller.text.length < 8) {
      setState(() => _error = 'Saisissez votre mot de passe');
      return;
    }
    Navigator.of(context).pop(_controller.text);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Supprimer le compte ?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Cette action est irréversible. Confirmez avec votre mot de passe.',
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('delete_password_field'),
            controller: _controller,
            obscureText: true,
            autofocus: true,
            decoration: InputDecoration(
              labelText: 'Mot de passe',
              errorText: _error,
            ),
            onSubmitted: (_) => _submit(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        FilledButton(
          key: const Key('delete_confirm'),
          style: FilledButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
          onPressed: _submit,
          child: const Text('Supprimer'),
        ),
      ],
    );
  }
}
