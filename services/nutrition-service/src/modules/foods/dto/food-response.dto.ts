export class FoodResponseDto {
  id!: string;
  source!: string;
  off_barcode!: string | null;
  owner_id!: string | null;
  name!: string;
  brand!: string | null;
  kcal_per_100g!: number;
  protein_per_100g!: number;
  carbs_per_100g!: number;
  fat_per_100g!: number;
  serving_size_g!: number | null;
  created_at!: Date;
}
