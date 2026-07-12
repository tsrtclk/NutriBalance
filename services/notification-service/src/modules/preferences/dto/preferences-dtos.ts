import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from "class-validator";

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** É9/É12 — partial update; omitted fields keep their current/default value.
 * All times are "HH:MM" UTC (backlog: D7). */
export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  meals_enabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @Matches(HH_MM, { each: true })
  meal_times?: string[];

  @IsOptional()
  @IsBoolean()
  hydration_enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(720)
  hydration_every_min?: number;

  @IsOptional()
  @IsBoolean()
  supplements_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  workout_enabled?: boolean;

  @IsOptional()
  @Matches(HH_MM)
  workout_time?: string;

  @IsOptional()
  @IsBoolean()
  goal_alerts_enabled?: boolean;
}

export class PreferencesResponseDto {
  user_id!: string;
  meals_enabled!: boolean;
  meal_times!: string[];
  hydration_enabled!: boolean;
  hydration_every_min!: number;
  supplements_enabled!: boolean;
  workout_enabled!: boolean;
  workout_time!: string;
  goal_alerts_enabled!: boolean;
}
