import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type Meal = (typeof MEALS)[number];

export class CreateJournalEntryDto {
  @IsUUID()
  food_item_id!: string;

  @IsIn([...MEALS])
  meal!: Meal;

  @IsNumber()
  @Min(1)
  @Max(5000)
  quantity_g!: number;

  /** Defaults to today (UTC) — allows logging a missed day. */
  @IsOptional()
  @IsDateString()
  eaten_on?: string;
}
