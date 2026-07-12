import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventBusService } from "@platform/events";

import { ExercisesRepository } from "../exercises/exercises.repository";
import { WorkoutsRepository } from "./workouts.repository";
import { computeWorkoutCalories } from "./compute-workout-calories";
import {
  suggestNextSession,
  type SessionSuggestion,
} from "./suggest-next-session";
import type {
  AddSetDto,
  CompleteWorkoutDto,
  StartWorkoutDto,
} from "./dto/workout-dtos";
import type {
  ProgressionPointDto,
  WorkoutResponseDto,
} from "./dto/workout-response.dto";

// Fallback for the kcal estimate when the user has no profile yet (D4).
const DEFAULT_WEIGHT_KG = 75;
const SUGGESTION_LOOKBACK_DAYS = 7;

@Injectable()
export class WorkoutsService {
  constructor(
    private readonly repo: WorkoutsRepository,
    private readonly exercises: ExercisesRepository,
    private readonly events: EventBusService,
  ) {}

  start(userId: string, dto: StartWorkoutDto): Promise<WorkoutResponseDto> {
    return this.repo.create(userId, dto.split_day, dto.notes);
  }

  async addSet(
    userId: string,
    workoutId: string,
    dto: AddSetDto,
  ): Promise<WorkoutResponseDto> {
    const workout = await this.getOwned(userId, workoutId);
    if (workout.ended_at) {
      throw new ConflictException({
        code: "WORKOUT_COMPLETED",
        message: "Cannot add sets to a completed workout",
      });
    }
    const exercise = await this.exercises.findAccessible(
      userId,
      dto.exercise_id,
    );
    if (!exercise) {
      throw new NotFoundException({
        code: "EXERCISE_NOT_FOUND",
        message: "Exercise not found",
      });
    }
    await this.repo.addSet(
      workoutId,
      dto.exercise_id,
      dto.reps,
      dto.weight_kg ?? 0,
      dto.rest_sec,
    );
    return this.getOwned(userId, workoutId);
  }

  async complete(
    userId: string,
    workoutId: string,
    dto: CompleteWorkoutDto,
    now = new Date(),
  ): Promise<WorkoutResponseDto> {
    const workout = await this.getOwned(userId, workoutId);
    if (workout.ended_at) {
      throw new ConflictException({
        code: "WORKOUT_COMPLETED",
        message: "Workout is already completed",
      });
    }
    const weightKg =
      (await this.repo.profileSnapshot(userId))?.weightKg ?? DEFAULT_WEIGHT_KG;
    const durationMin = (now.getTime() - workout.started_at.getTime()) / 60_000;
    const estKcal = computeWorkoutCalories(weightKg, durationMin, dto.rpe);
    const completed = await this.repo.complete(
      workoutId,
      now,
      estKcal,
      dto.rpe,
      dto.notes,
    );
    await this.events.publish("workout.completed", {
      user_id: userId,
      workout_id: workoutId,
      split_day: completed.split_day,
      total_volume_kg: completed.total_volume_kg,
      est_kcal: estKcal,
    });
    return completed;
  }

  list(userId: string): Promise<WorkoutResponseDto[]> {
    return this.repo.list(userId);
  }

  getOwnedOrThrow(userId: string, id: string): Promise<WorkoutResponseDto> {
    return this.getOwned(userId, id);
  }

  /** É6 — progression curve for one exercise (surcharge progressive). */
  progression(
    userId: string,
    exerciseId: string,
  ): Promise<ProgressionPointDto[]> {
    return this.repo.progression(userId, exerciseId);
  }

  /** É6 — next-session suggestion from the recent history + profile level. */
  async suggestion(
    userId: string,
    now = new Date(),
  ): Promise<SessionSuggestion> {
    const since = new Date(
      now.getTime() - SUGGESTION_LOOKBACK_DAYS * 24 * 3600 * 1000,
    );
    const [recent, profile] = await Promise.all([
      this.repo.recentWithGroups(userId, since),
      this.repo.profileSnapshot(userId),
    ]);
    return suggestNextSession(recent, profile?.trainingLevel, now);
  }

  private async getOwned(
    userId: string,
    id: string,
  ): Promise<WorkoutResponseDto> {
    const workout = await this.repo.findOwned(userId, id);
    if (!workout) {
      throw new NotFoundException({
        code: "WORKOUT_NOT_FOUND",
        message: "Workout not found",
      });
    }
    return workout;
  }
}
