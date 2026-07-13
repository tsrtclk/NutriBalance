import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/session_controller.dart';

const _activityLabels = {
  'sedentary': 'Sédentaire',
  'light': 'Légèrement actif',
  'moderate': 'Modérément actif',
  'active': 'Actif',
  'very_active': 'Très actif',
};

const _goalLabels = {
  'lose': 'Perdre du poids',
  'maintain': 'Maintenir',
  'gain': 'Prendre du poids',
  'recomp': 'Recomposition',
};

/// É1 onboarding — collects the target-formula inputs (D1) and PUTs the
/// profile; the dashboard then reads the computed targets.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _birthDate = TextEditingController();
  final _height = TextEditingController();
  final _weight = TextEditingController();
  String _sex = 'male';
  String _activity = 'moderate';
  String _goal = 'maintain';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _birthDate.dispose();
    _height.dispose();
    _weight.dispose();
    super.dispose();
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(now.year - 100),
      lastDate: DateTime(now.year - 13),
    );
    if (picked != null) {
      _birthDate.text = picked.toIso8601String().substring(0, 10);
    }
  }

  String? _validDate(String? v) {
    if (v == null || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(v)) {
      return 'Format AAAA-MM-JJ';
    }
    return DateTime.tryParse(v) == null ? 'Date invalide' : null;
  }

  String? _validNumber(String? v, double min, double max, String unit) {
    final n = double.tryParse((v ?? '').replaceAll(',', '.'));
    if (n == null || n < min || n > max) return 'Entre $min et $max $unit';
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<SessionController>().completeOnboarding({
        'sex': _sex,
        'birth_date': _birthDate.text,
        'height_cm': double.parse(_height.text.replaceAll(',', '.')),
        'weight_kg': double.parse(_weight.text.replaceAll(',', '.')),
        'activity_level': _activity,
        'goal': _goal,
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Votre profil')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Quelques informations pour calculer vos objectifs',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      key: const Key('onboarding_sex'),
                      initialValue: _sex,
                      decoration: const InputDecoration(labelText: 'Sexe'),
                      items: const [
                        DropdownMenuItem(value: 'male', child: Text('Homme')),
                        DropdownMenuItem(value: 'female', child: Text('Femme')),
                      ],
                      onChanged: (v) => setState(() => _sex = v!),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      key: const Key('onboarding_birth_date'),
                      controller: _birthDate,
                      keyboardType: TextInputType.datetime,
                      decoration: InputDecoration(
                        labelText: 'Date de naissance (AAAA-MM-JJ)',
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.calendar_today),
                          tooltip: 'Choisir une date',
                          onPressed: _pickBirthDate,
                        ),
                      ),
                      validator: _validDate,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      key: const Key('onboarding_height'),
                      controller: _height,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Taille (cm)',
                      ),
                      validator: (v) => _validNumber(v, 100, 250, 'cm'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      key: const Key('onboarding_weight'),
                      controller: _weight,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Poids (kg)',
                      ),
                      validator: (v) => _validNumber(v, 30, 350, 'kg'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      key: const Key('onboarding_activity'),
                      initialValue: _activity,
                      decoration: const InputDecoration(
                        labelText: "Niveau d'activité",
                      ),
                      items: [
                        for (final e in _activityLabels.entries)
                          DropdownMenuItem(value: e.key, child: Text(e.value)),
                      ],
                      onChanged: (v) => setState(() => _activity = v!),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      key: const Key('onboarding_goal'),
                      initialValue: _goal,
                      decoration: const InputDecoration(labelText: 'Objectif'),
                      items: [
                        for (final e in _goalLabels.entries)
                          DropdownMenuItem(value: e.key, child: Text(e.value)),
                      ],
                      onChanged: (v) => setState(() => _goal = v!),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        key: const Key('onboarding_error'),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      key: const Key('onboarding_submit'),
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Calculer mes objectifs'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
