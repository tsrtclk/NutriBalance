import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../state/session_controller.dart';
import '../widgets/error_snackbar.dart';
import 'journal_screen.dart' show mealLabels;

/// É3 — search the food catalogue (local + provider) and log a portion. Pops
/// `true` when an entry was created, so the journal reloads.
class FoodSearchScreen extends StatefulWidget {
  const FoodSearchScreen({super.key});

  @override
  State<FoodSearchScreen> createState() => _FoodSearchScreenState();
}

class _FoodSearchScreenState extends State<FoodSearchScreen> {
  final _query = TextEditingController();
  List<Food> _results = const [];
  bool _searching = false;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _query.text.trim();
    if (q.isEmpty) return;
    setState(() => _searching = true);
    final api = context.read<SessionController>().api;
    try {
      final data = await api.get('/foods/search?q=$q') as List<dynamic>;
      if (!mounted) return;
      setState(() {
        _results = [
          for (final f in data) Food.fromJson(f as Map<String, dynamic>),
        ];
        _searching = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _searching = false);
      showApiError(context, e);
    }
  }

  Future<void> _pick(Food food) async {
    final request = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => _LogPortionDialog(food: food),
    );
    if (request == null || !mounted) return;
    final api = context.read<SessionController>().api;
    try {
      await api.post('/journal', body: request);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ajouter un aliment')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              key: const Key('food_search_field'),
              controller: _query,
              autofocus: true,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                labelText: 'Rechercher un aliment',
                suffixIcon: IconButton(
                  key: const Key('food_search_button'),
                  icon: const Icon(Icons.search),
                  onPressed: _search,
                ),
              ),
              onSubmitted: (_) => _search(),
            ),
          ),
          if (_searching) const LinearProgressIndicator(),
          Expanded(
            child: ListView(
              children: [
                for (final food in _results)
                  ListTile(
                    key: Key('food_result_${food.id}'),
                    title: Text(food.name),
                    subtitle: Text(
                      [
                        if (food.brand != null && food.brand!.isNotEmpty)
                          food.brand,
                        '${food.kcalPer100g.round()} kcal / 100 g',
                      ].join(' · '),
                    ),
                    trailing: const Icon(Icons.add_circle_outline),
                    onTap: () => _pick(food),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Choose a meal + quantity for the picked food. Returns the POST /journal body.
class _LogPortionDialog extends StatefulWidget {
  const _LogPortionDialog({required this.food});

  final Food food;

  @override
  State<_LogPortionDialog> createState() => _LogPortionDialogState();
}

class _LogPortionDialogState extends State<_LogPortionDialog> {
  final _quantity = TextEditingController(text: '100');
  String _meal = 'breakfast';
  String? _error;

  @override
  void dispose() {
    _quantity.dispose();
    super.dispose();
  }

  void _submit() {
    final q = double.tryParse(_quantity.text.replaceAll(',', '.'));
    if (q == null || q < 1 || q > 5000) {
      setState(() => _error = 'Entre 1 et 5000 g');
      return;
    }
    Navigator.of(
      context,
    ).pop({'food_item_id': widget.food.id, 'meal': _meal, 'quantity_g': q});
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.food.name),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DropdownButtonFormField<String>(
            key: const Key('portion_meal'),
            initialValue: _meal,
            decoration: const InputDecoration(labelText: 'Repas'),
            items: [
              for (final e in mealLabels.entries)
                DropdownMenuItem(value: e.key, child: Text(e.value)),
            ],
            onChanged: (v) => setState(() => _meal = v!),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('portion_quantity'),
            controller: _quantity,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'Quantité (g)',
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
          key: const Key('portion_submit'),
          onPressed: _submit,
          child: const Text('Ajouter'),
        ),
      ],
    );
  }
}
