import { IsDateString, IsNumber, IsOptional, Max, Min } from "class-validator";

export class CreateWeightEntryDto {
  @IsNumber()
  @Min(30)
  @Max(350)
  weight_kg!: number;

  /** Defaults to now — allows backfilling missed measurements. */
  @IsOptional()
  @IsDateString()
  measured_at?: string;
}
