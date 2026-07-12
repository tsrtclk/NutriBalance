import { IsDateString, IsInt, IsOptional, Max, Min } from "class-validator";

/** É4 — quick-add: verre (250), bouteille (500), ou quantité perso. */
export class CreateHydrationEntryDto {
  @IsInt()
  @Min(10)
  @Max(5000)
  amount_ml!: number;

  /** Defaults to now — allows backfilling. */
  @IsOptional()
  @IsDateString()
  drunk_at?: string;
}

export class HydrationEntryResponseDto {
  id!: string;
  user_id!: string;
  amount_ml!: number;
  drunk_at!: Date;
  created_at!: Date;
}

/** One hydration day: entries + running total (the target comes from
 * profile-service's `GET /profile/targets` → `water_ml`, see B15). */
export class HydrationDayResponseDto {
  date!: string;
  total_ml!: number;
  entries!: HydrationEntryResponseDto[];
}
