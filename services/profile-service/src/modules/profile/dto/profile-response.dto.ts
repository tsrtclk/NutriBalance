export class ProfileResponseDto {
  id!: string;
  user_id!: string;
  sex!: string;
  birth_date!: string;
  height_cm!: number;
  weight_kg!: number;
  activity_level!: string;
  goal!: string;
  target_weight_kg!: number | null;
  target_date!: string | null;
  training_level!: string | null;
  equipment!: string | null;
  created_at!: Date;
  updated_at!: Date;
}
