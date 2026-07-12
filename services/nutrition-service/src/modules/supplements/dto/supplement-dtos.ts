import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** É5 — a supplement with its dosage and scheduled times of day. */
export class CreateSupplementDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @Length(1, 60)
  dosage!: string;

  /** Horaires de prise, "HH:MM" — feeds the É9 reminders later. */
  @IsArray()
  @ArrayMaxSize(8)
  @Matches(HH_MM, { each: true })
  times!: string[];
}

export class LogIntakeDto {
  /** Defaults to now — allows backfilling a missed check-off. */
  @IsOptional()
  @IsDateString()
  taken_at?: string;
}

export class SupplementResponseDto {
  id!: string;
  user_id!: string;
  name!: string;
  dosage!: string;
  times!: string[];
  active!: boolean;
  created_at!: Date;
}

export class SupplementIntakeResponseDto {
  id!: string;
  supplement_id!: string;
  supplement_name!: string;
  taken_at!: Date;
}
