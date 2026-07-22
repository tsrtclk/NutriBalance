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

/// GET /hydration?date=… — the day's total + entries (É4).
class HydrationDay {
  HydrationDay({required this.date, required this.totalMl});

  factory HydrationDay.fromJson(Map<String, dynamic> json) => HydrationDay(
    date: (json['date'] as String?) ?? '',
    totalMl: _num(json['total_ml']).toInt(),
  );

  final String date;
  final int totalMl;
}

/// A food from GET /foods/search (É3): OpenFoodFacts cache or custom, macros
/// per 100 g.
class Food {
  Food({
    required this.id,
    required this.name,
    required this.brand,
    required this.kcalPer100g,
  });

  factory Food.fromJson(Map<String, dynamic> json) => Food(
    id: json['id'] as String,
    name: (json['name'] as String?) ?? '',
    brand: json['brand'] as String?,
    kcalPer100g: _num(json['kcal_per_100g']),
  );

  final String id;
  final String name;
  final String? brand;
  final double kcalPer100g;
}

/// One journal line (É3): a food eaten at a meal, with its snapshot kcal.
class JournalEntry {
  JournalEntry({
    required this.id,
    required this.foodName,
    required this.quantityG,
    required this.kcal,
  });

  factory JournalEntry.fromJson(Map<String, dynamic> json) => JournalEntry(
    id: json['id'] as String,
    foodName: (json['food_name'] as String?) ?? '',
    quantityG: _num(json['quantity_g']),
    kcal: _num(json['kcal']),
  );

  final String id;
  final String foodName;
  final double quantityG;
  final double kcal;
}

/// GET /journal?date=… — entries grouped by meal + day totals (É3).
class JournalDay {
  JournalDay({required this.mealsByKey, required this.totalKcal});

  factory JournalDay.fromJson(Map<String, dynamic> json) {
    final rawMeals = (json['meals'] as Map<String, dynamic>?) ?? const {};
    final meals = <String, List<JournalEntry>>{};
    rawMeals.forEach((meal, list) {
      meals[meal] = [
        for (final e in (list as List<dynamic>))
          JournalEntry.fromJson(e as Map<String, dynamic>),
      ];
    });
    final totals = (json['totals'] as Map<String, dynamic>?) ?? const {};
    return JournalDay(
      mealsByKey: meals,
      totalKcal: _num(totals['kcal']).toInt(),
    );
  }

  final Map<String, List<JournalEntry>> mealsByKey;
  final int totalKcal;
}

/// GET /settings — display units (É12). The API stays metric (D13).
class UserSettings {
  UserSettings({required this.weightUnit, required this.heightUnit});

  factory UserSettings.fromJson(Map<String, dynamic> json) => UserSettings(
    weightUnit: (json['weight_unit'] as String?) ?? 'kg',
    heightUnit: (json['height_unit'] as String?) ?? 'cm',
  );

  final String weightUnit;
  final String heightUnit;
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
