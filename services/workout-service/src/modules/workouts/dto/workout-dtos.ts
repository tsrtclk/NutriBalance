import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";

export const SPLIT_DAYS = [
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full_body",
] as const;

export class StartWorkoutDto {
  @IsOptional()
  @IsIn([...SPLIT_DAYS])
  split_day?: (typeof SPLIT_DAYS)[number];

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string;
}

export class AddSetDto {
  @IsUUID()
  exercise_id!: string;

  @IsInt()
  @Min(1)
  @Max(200)
  reps!: number;

  /** Omit or 0 for bodyweight work. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(600)
  weight_kg?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1800)
  rest_sec?: number;
}

export class CompleteWorkoutDto {
  /** RPE — intensité ressentie 1-10. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rpe?: number;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string;
}
