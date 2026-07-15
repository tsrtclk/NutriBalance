import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../state/session_controller.dart';
import '../widgets/error_snackbar.dart';

/// É4 — quick-add water and see the day's running total against the target
/// (the target comes from the computed profile targets, B15). Logging feeds
/// the hydration streak (É10) through the bus.
class HydrationScreen extends StatefulWidget {
  const HydrationScreen({super.key});

  @override
  State<HydrationScreen> createState() => _HydrationScreenState();
}

class _HydrationScreenState extends State<HydrationScreen> {
  HydrationDay? _day;
  int _targetMl = 0;
  bool _loading = true;
  bool _adding = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String get _today =>
      DateTime.now().toUtc().toIso8601String().substring(0, 10);

  Future<void> _load() async {
    setState(() => _loading = true);
    final api = context.read<SessionController>().api;
    try {
      final results = await Future.wait([
        api.get('/hydration?date=$_today'),
        api.get('/profile/targets'),
      ]);
      if (!mounted) return;
      setState(() {
        _day = HydrationDay.fromJson(results[0] as Map<String, dynamic>);
        _targetMl = DailyTargets.fromJson(
          results[1] as Map<String, dynamic>,
        ).waterMl.toInt();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showApiError(context, e, onRetry: _load);
    }
  }

  Future<void> _add(int amountMl) async {
    setState(() => _adding = true);
    final api = context.read<SessionController>().api;
    try {
      await api.post('/hydration', body: {'amount_ml': amountMl});
      await _load();
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = _day?.totalMl ?? 0;
    final ratio = _targetMl == 0 ? 0.0 : (total / _targetMl).clamp(0.0, 1.0);
    return Scaffold(
      appBar: AppBar(title: const Text('Hydratation')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Aujourd'hui",
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _targetMl == 0
                                ? '$total ml'
                                : '$total / $_targetMl ml',
                            key: const Key('hydration_total'),
                            style: theme.textTheme.displaySmall,
                          ),
                          const SizedBox(height: 12),
                          LinearProgressIndicator(value: ratio),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Ajouter', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _AddButton(
                        keyValue: 'hydration_add_glass',
                        label: 'Verre\n250 ml',
                        onTap: _adding ? null : () => _add(250),
                      ),
                      _AddButton(
                        keyValue: 'hydration_add_bottle',
                        label: 'Bouteille\n500 ml',
                        onTap: _adding ? null : () => _add(500),
                      ),
                      _AddButton(
                        keyValue: 'hydration_add_custom',
                        label: 'Perso…',
                        onTap: _adding ? null : _addCustom,
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }

  Future<void> _addCustom() async {
    final amount = await showDialog<int>(
      context: context,
      builder: (_) => const _CustomAmountDialog(),
    );
    if (amount != null) await _add(amount);
  }
}

class _AddButton extends StatelessWidget {
  const _AddButton({
    required this.keyValue,
    required this.label,
    required this.onTap,
  });

  final String keyValue;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 100,
      height: 72,
      child: OutlinedButton(
        key: Key(keyValue),
        onPressed: onTap,
        child: Text(label, textAlign: TextAlign.center),
      ),
    );
  }
}

class _CustomAmountDialog extends StatefulWidget {
  const _CustomAmountDialog();

  @override
  State<_CustomAmountDialog> createState() => _CustomAmountDialogState();
}

class _CustomAmountDialogState extends State<_CustomAmountDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final v = int.tryParse(_controller.text);
    if (v == null || v < 10 || v > 5000) {
      setState(() => _error = 'Entre 10 et 5000 ml');
      return;
    }
    Navigator.of(context).pop(v);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Quantité (ml)'),
      content: TextField(
        key: const Key('hydration_custom_field'),
        controller: _controller,
        keyboardType: TextInputType.number,
        autofocus: true,
        decoration: InputDecoration(errorText: _error, hintText: 'ex. 330'),
        onSubmitted: (_) => _submit(),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        FilledButton(
          key: const Key('hydration_custom_submit'),
          onPressed: _submit,
          child: const Text('Ajouter'),
        ),
      ],
    );
  }
}
