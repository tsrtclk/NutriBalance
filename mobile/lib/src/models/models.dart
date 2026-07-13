/// Lightweight read models for the first journey. Parsed defensively: the
/// backend serialises Prisma Decimals as strings, so numbers go through
/// [_num].
library;

double _num(dynamic v) =>
    v == null ? 0 : (v is num ? v.toDouble() : double.tryParse('$v') ?? 0);

/// GET /profile/targets — the computed daily targets (É1).
class DailyTargets {
  DailyTargets({
    required this.caloriesKcal,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
    required this.waterMl,
    required this.weeklyRateKg,
  });

  factory DailyTargets.fromJson(Map<String, dynamic> json) => DailyTargets(
    caloriesKcal: _num(json['calories_kcal']),
    proteinG: _num(json['protein_g']),
    carbsG: _num(json['carbs_g']),
    fatG: _num(json['fat_g']),
    waterMl: _num(json['water_ml']),
    weeklyRateKg: _num(json['weekly_rate_kg']),
  );

  final double caloriesKcal;
  final double proteinG;
  final double carbsG;
  final double fatG;
  final double waterMl;
  final double weeklyRateKg;
}

/// One chain from GET /gamification/streaks (É10).
class Streak {
  Streak({required this.current, required this.best});

  factory Streak.fromJson(Map<String, dynamic>? json) => Streak(
    current: _num(json?['current']).toInt(),
    best: _num(json?['best']).toInt(),
  );

  final int current;
  final int best;
}

class Streaks {
  Streaks({required this.byKind});

  factory Streaks.fromJson(Map<String, dynamic> json) => Streaks(
    byKind: {
      for (final kind in const [
        'journal',
        'workout',
        'hydration',
        'supplement',
      ])
        kind: Streak.fromJson(json[kind] as Map<String, dynamic>?),
    },
  );

  final Map<String, Streak> byKind;
}

/// GET /gamification/challenge — the week's défi (É10).
class WeeklyChallenge {
  WeeklyChallenge({
    required this.title,
    required this.progress,
    required this.target,
    required this.completed,
  });

  factory WeeklyChallenge.fromJson(Map<String, dynamic> json) =>
      WeeklyChallenge(
        title: (json['title'] as String?) ?? '',
        progress: _num(json['progress']).toInt(),
        target: _num(json['target']).toInt(),
        completed: json['completed'] == true,
      );

  final String title;
  final int progress;
  final int target;
  final bool completed;
}
