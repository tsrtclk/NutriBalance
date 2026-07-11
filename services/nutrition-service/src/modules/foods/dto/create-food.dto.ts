import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

/** É3 — manual food entry: name + nutrition per 100 g. */
export class CreateFoodDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  brand?: string;

  @IsNumber()
  @Min(0)
  @Max(900)
  kcal_per_100g!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  protein_per_100g!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  carbs_per_100g!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  fat_per_100g!: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5000)
  serving_size_g?: number;
}
