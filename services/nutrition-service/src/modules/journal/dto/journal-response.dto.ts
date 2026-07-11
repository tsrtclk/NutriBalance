export class JournalEntryResponseDto {
  id!: string;
  user_id!: string;
  food_item_id!: string;
  food_name!: string;
  meal!: string;
  quantity_g!: number;
  eaten_on!: string;
  kcal!: number;
  protein_g!: number;
  carbs_g!: number;
  fat_g!: number;
  created_at!: Date;
}

export class DayTotalsDto {
  kcal!: number;
  protein_g!: number;
  carbs_g!: number;
  fat_g!: number;
}

/** One journal day: entries grouped by meal + running totals. */
export class JournalDayResponseDto {
  date!: string;
  meals!: Record<string, JournalEntryResponseDto[]>;
  totals!: DayTotalsDto;
}
