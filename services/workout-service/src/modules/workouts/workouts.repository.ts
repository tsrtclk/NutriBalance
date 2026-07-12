import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { Prisma } from "@platform/prisma-client";

import type { RecentWorkout } from "./suggest-next-session";
import type {
  ProgressionPointDto,
  WorkoutResponseDto,
  WorkoutSetResponseDto,
} from "./dto/workout-response.dto";

type WorkoutWithSets = Prisma.WorkoutGetPayload<{
  include: {
    sets: {
      include: {
        exercise: { select: { name: true; muscle_group: true } };
      };
    };
  };
}>;

const INCLUDE_SETS = {
  sets: {
    include: { exercise: { select: { name: true, muscle_group: true } } },
    orderBy: { set_number: "asc" as const },
  },
};

@Injectable()
export class WorkoutsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    splitDay?: string,
    notes?: string,
  ): Promise<WorkoutResponseDto> {
    const row = await this.prisma.workout.create({
      data: { user_id: userId, split_day: splitDay ?? null, notes },
      include: INCLUDE_SETS,
    });
    return this.toDto(row);
  }

  async findOwned(
    userId: string,
    id: string,
  ): Promise<WorkoutResponseDto | null> {
    const row = await this.prisma.workout.findFirst({
      where: { id, user_id: userId },
      include: INCLUDE_SETS,
    });
    return row ? this.toDto(row) : null;
  }

  async addSet(
    workoutId: string,
    exerciseId: string,
    reps: number,
    weightKg: number,
    restSec?: number,
  ): Promise<void> {
    const setNumber =
      (await this.prisma.workoutSet.count({
        where: { workout_id: workoutId },
      })) + 1;
    await this.prisma.workoutSet.create({
      data: {
        workout_id: workoutId,
        exercise_id: exerciseId,
        set_number: setNumber,
        reps,
        weight_kg: weightKg,
        rest_sec: restSec,
      },
    });
  }

  async complete(
    id: string,
    endedAt: Date,
    estKcal: number,
    rpe?: number,
    notes?: string,
  ): Promise<WorkoutResponseDto> {
    const row = await this.prisma.workout.update({
      where: { id },
      data: {
        ended_at: endedAt,
        est_kcal: estKcal,
        ...(rpe != null ? { rpe } : {}),
        ...(notes != null ? { notes } : {}),
      },
      include: INCLUDE_SETS,
    });
    return this.toDto(row);
  }

  async list(userId: string, limit = 50): Promise<WorkoutResponseDto[]> {
    const rows = await this.prisma.workout.findMany({
      where: { user_id: userId },
      include: INCLUDE_SETS,
      orderBy: { started_at: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toDto(r));
  }

  /** Recent sessions with their trained muscle groups (suggestion input). */
  async recentWithGroups(
    userId: string,
    since: Date,
    limit = 10,
  ): Promise<RecentWorkout[]> {
    const rows = await this.prisma.workout.findMany({
      where: { user_id: userId, started_at: { gte: since } },
      include: {
        sets: { include: { exercise: { select: { muscle_group: true } } } },
      },
      orderBy: { started_at: "desc" },
      take: limit,
    });
    return rows.map((w) => ({
      at: w.ended_at ?? w.started_at,
      splitDay: w.split_day,
      muscleGroups: [
        ...new Set(w.sets.map((s) => s.exercise.muscle_group)),
      ].sort(),
    }));
  }

  /** Per-session aggregates for one exercise, oldest first (the curve). */
  async progression(
    userId: string,
    exerciseId: string,
    limit = 100,
  ): Promise<ProgressionPointDto[]> {
    const sets = await this.prisma.workoutSet.findMany({
      where: { exercise_id: exerciseId, workout: { user_id: userId } },
      include: { workout: { select: { started_at: true } } },
      orderBy: { workout: { started_at: "asc" } },
      take: limit * 10,
    });
    const byDay = new Map<string, ProgressionPointDto>();
    for (const s of sets) {
      const date = s.workout.started_at.toISOString().slice(0, 10);
      const point = byDay.get(date) ?? {
        date,
        top_weight_kg: 0,
        total_volume_kg: 0,
        total_reps: 0,
      };
      const weight = Number(s.weight_kg);
      point.top_weight_kg = Math.max(point.top_weight_kg, weight);
      point.total_volume_kg += weight * s.reps;
      point.total_reps += s.reps;
      byDay.set(date, point);
    }
    return [...byDay.values()].slice(-limit);
  }

  /** Weight (kcal estimate) + training level (suggestion); nulls without a
   * profile. */
  async profileSnapshot(
    userId: string,
  ): Promise<{ weightKg: number; trainingLevel: string | null } | null> {
    // backlog: X3 — cross-service table read (profiles belongs to
    // profile-service); acceptable on the shared DB, revisit if services split.
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
      select: { weight_kg: true, training_level: true },
    });
    return profile
      ? {
          weightKg: Number(profile.weight_kg),
          trainingLevel: profile.training_level,
        }
      : null;
  }

  private toDto(row: WorkoutWithSets): WorkoutResponseDto {
    const sets: WorkoutSetResponseDto[] = row.sets.map((s) => ({
      id: s.id,
      exercise_id: s.exercise_id,
      exercise_name: s.exercise.name,
      muscle_group: s.exercise.muscle_group,
      set_number: s.set_number,
      reps: s.reps,
      weight_kg: Number(s.weight_kg),
      rest_sec: s.rest_sec,
    }));
    return {
      id: row.id,
      user_id: row.user_id,
      split_day: row.split_day,
      notes: row.notes,
      rpe: row.rpe,
      started_at: row.started_at,
      ended_at: row.ended_at,
      est_kcal: row.est_kcal,
      total_volume_kg:
        Math.round(
          sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0) * 10,
        ) / 10,
      set_count: sets.length,
      sets,
    };
  }
}
