export class WorkoutSetResponseDto {
  id!: string;
  exercise_id!: string;
  exercise_name!: string;
  muscle_group!: string;
  set_number!: number;
  reps!: number;
  weight_kg!: number;
  rest_sec!: number | null;
}

export class WorkoutResponseDto {
  id!: string;
  user_id!: string;
  split_day!: string | null;
  notes!: string | null;
  rpe!: number | null;
  started_at!: Date;
  ended_at!: Date | null;
  est_kcal!: number | null;
  /** Σ reps × weight over all sets (kg) — the progressive-overload number. */
  total_volume_kg!: number;
  set_count!: number;
  sets!: WorkoutSetResponseDto[];
}

/** One point of the per-exercise progression curve (É6 surcharge progressive). */
export class ProgressionPointDto {
  date!: string;
  top_weight_kg!: number;
  total_volume_kg!: number;
  total_reps!: number;
}
