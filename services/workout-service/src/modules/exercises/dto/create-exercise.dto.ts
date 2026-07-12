import { IsIn, IsOptional, IsString, IsUrl, Length } from "class-validator";

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "core",
  "full_body",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = ["none", "home", "gym"] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/** É6 — a user-created exercise (the seeded library covers the basics). */
export class CreateExerciseDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsIn([...MUSCLE_GROUPS])
  muscle_group!: MuscleGroup;

  @IsIn([...EQUIPMENT])
  equipment!: Equipment;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  instructions?: string;

  @IsOptional()
  @IsUrl()
  @Length(1, 300)
  media_url?: string;
}
