import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../state/session_controller.dart';

const _streakLabels = {
  'journal': 'Journal',
  'workout': 'Séances',
  'hydration': 'Hydratation',
  'supplement': 'Compléments',
};

class _DashboardData {
  _DashboardData(this.targets, this.streaks, this.challenge);

  final DailyTargets targets;
  final Streaks streaks;
  final WeeklyChallenge challenge;
}

/// Home of the first journey: the computed daily targets (É1) next to the
/// gamification state (É10) — one glance answers "où j'en suis aujourd'hui ?".
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<_DashboardData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_DashboardData> _load() async {
    final api = context.read<SessionController>().api;
    final results = await Future.wait([
      api.get('/profile/targets'),
      api.get('/gamification/streaks'),
      api.get('/gamification/challenge'),
    ]);
    return _DashboardData(
      DailyTargets.fromJson(results[0] as Map<String, dynamic>),
      Streaks.fromJson(results[1] as Map<String, dynamic>),
      WeeklyChallenge.fromJson(results[2] as Map<String, dynamic>),
    );
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Aujourd\'hui')),
      body: FutureBuilder<_DashboardData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Impossible de charger vos données'),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    key: const Key('dashboard_retry'),
                    onPressed: _refresh,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final data = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _TargetsCard(targets: data.targets),
                const SizedBox(height: 12),
                _StreaksCard(streaks: data.streaks),
                const SizedBox(height: 12),
                _ChallengeCard(challenge: data.challenge),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TargetsCard extends StatelessWidget {
  const _TargetsCard({required this.targets});

  final DailyTargets targets;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Objectifs du jour', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              '${targets.caloriesKcal.round()} kcal',
              key: const Key('targets_kcal'),
              style: theme.textTheme.displaySmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text('P ${targets.proteinG.round()} g')),
                Chip(label: Text('G ${targets.carbsG.round()} g')),
                Chip(label: Text('L ${targets.fatG.round()} g')),
                Chip(
                  avatar: const Icon(Icons.water_drop, size: 18),
                  label: Text('${targets.waterMl.round()} ml'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StreaksCard extends StatelessWidget {
  const _StreaksCard({required this.streaks});

  final Streaks streaks;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Séries en cours', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in _streakLabels.entries)
                  Chip(
                    key: Key('streak_${entry.key}'),
                    avatar: const Icon(Icons.local_fire_department, size: 18),
                    label: Text(
                      '${entry.value} : '
                      '${streaks.byKind[entry.key]?.current ?? 0} j',
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ChallengeCard extends StatelessWidget {
  const _ChallengeCard({required this.challenge});

  final WeeklyChallenge challenge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = challenge.target == 0
        ? 0.0
        : (challenge.progress / challenge.target).clamp(0.0, 1.0);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Défi de la semaine',
                    style: theme.textTheme.titleMedium,
                  ),
                ),
                if (challenge.completed)
                  const Icon(Icons.emoji_events, key: Key('challenge_done')),
              ],
            ),
            const SizedBox(height: 8),
            Text(challenge.title, key: const Key('challenge_title')),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: progress),
            const SizedBox(height: 4),
            Text(
              '${challenge.progress} / ${challenge.target}',
              key: const Key('challenge_progress'),
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
