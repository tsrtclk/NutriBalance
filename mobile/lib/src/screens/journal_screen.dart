import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../state/session_controller.dart';
import '../widgets/error_snackbar.dart';
import 'food_search_screen.dart';

/// É3 — the day's food journal: entries grouped by meal with running kcal vs
/// the computed target (É1). Logging feeds the journal streak (É10) via the
/// bus. Adding goes through the food-search flow.
const mealLabels = <String, String>{
  'breakfast': 'Petit-déjeuner',
  'lunch': 'Déjeuner',
  'dinner': 'Dîner',
  'snack': 'Collation',
};

class JournalScreen extends StatefulWidget {
  const JournalScreen({super.key});

  @override
  State<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends State<JournalScreen> {
  JournalDay? _day;
  int _targetKcal = 0;
  bool _loading = true;

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
        api.get('/journal?date=$_today'),
        api.get('/profile/targets'),
      ]);
      if (!mounted) return;
      setState(() {
        _day = JournalDay.fromJson(results[0] as Map<String, dynamic>);
        _targetKcal = DailyTargets.fromJson(
          results[1] as Map<String, dynamic>,
        ).caloriesKcal.toInt();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showApiError(context, e, onRetry: _load);
    }
  }

  Future<void> _delete(String id) async {
    final api = context.read<SessionController>().api;
    try {
      await api.delete('/journal/$id');
      await _load();
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  Future<void> _addFood() async {
    final added = await Navigator.of(
      context,
    ).push<bool>(MaterialPageRoute(builder: (_) => const FoodSearchScreen()));
    if (added == true) await _load();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final day = _day;
    return Scaffold(
      appBar: AppBar(title: const Text('Journal')),
      floatingActionButton: FloatingActionButton(
        key: const Key('journal_add'),
        onPressed: _addFood,
        child: const Icon(Icons.add),
      ),
      body: _loading || day == null
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
                            _targetKcal == 0
                                ? '${day.totalKcal} kcal'
                                : '${day.totalKcal} / $_targetKcal kcal',
                            key: const Key('journal_total'),
                            style: theme.textTheme.displaySmall,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final entry in mealLabels.entries)
                    _MealSection(
                      label: entry.value,
                      entries: day.mealsByKey[entry.key] ?? const [],
                      onDelete: _delete,
                    ),
                  if (day.mealsByKey.values.every((l) => l.isEmpty))
                    Padding(
                      padding: const EdgeInsets.only(top: 24),
                      child: Center(
                        child: Text(
                          'Rien de consigné aujourd\'hui.\nAppuyez sur + pour ajouter un aliment.',
                          key: const Key('journal_empty'),
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class _MealSection extends StatelessWidget {
  const _MealSection({
    required this.label,
    required this.entries,
    required this.onDelete,
  });

  final String label;
  final List<JournalEntry> entries;
  final void Function(String id) onDelete;

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 12, 4, 4),
          child: Text(label, style: theme.textTheme.titleSmall),
        ),
        for (final e in entries)
          Dismissible(
            key: Key('journal_entry_${e.id}'),
            direction: DismissDirection.endToStart,
            onDismissed: (_) => onDelete(e.id),
            background: Container(
              alignment: Alignment.centerRight,
              padding: const EdgeInsets.only(right: 16),
              color: theme.colorScheme.errorContainer,
              child: const Icon(Icons.delete),
            ),
            child: ListTile(
              dense: true,
              title: Text(e.foodName),
              subtitle: Text('${e.quantityG.round()} g'),
              trailing: Text('${e.kcal.round()} kcal'),
            ),
          ),
      ],
    );
  }
}
