import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";

import type { ActivityLevel, Goal, Sex } from "@platform/domain";

const SEXES: Sex[] = ["male", "female"];
const ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];
const GOALS: Goal[] = ["lose", "maintain", "gain", "recomp"];
const TRAINING_LEVELS = ["beginner", "intermediate", "advanced"] as const;
const EQUIPMENT = ["none", "home", "gym"] as const;

/** É1 onboarding payload — the full profile is written on every save (PUT). */
export class UpsertProfileDto {
  @IsIn(SEXES)
  sex!: Sex;

  @IsDateString()
  birth_date!: string;

  @IsNumber()
  @Min(100)
  @Max(250)
  height_cm!: number;

  @IsNumber()
  @Min(30)
  @Max(350)
  weight_kg!: number;

  @IsIn(ACTIVITY_LEVELS)
  activity_level!: ActivityLevel;

  @IsIn(GOALS)
  goal!: Goal;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(350)
  target_weight_kg?: number;

  @IsOptional()
  @IsDateString()
  target_date?: string;

  @IsOptional()
  @IsIn([...TRAINING_LEVELS])
  training_level?: (typeof TRAINING_LEVELS)[number];

  @IsOptional()
  @IsIn([...EQUIPMENT])
  equipment?: (typeof EQUIPMENT)[number];
}
