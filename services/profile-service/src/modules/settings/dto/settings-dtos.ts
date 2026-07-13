import { IsIn, IsOptional } from "class-validator";
import {
  HEIGHT_UNITS,
  WEIGHT_UNITS,
  type HeightUnit,
  type WeightUnit,
} from "@platform/domain";

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(WEIGHT_UNITS as readonly string[])
  weight_unit?: WeightUnit;

  @IsOptional()
  @IsIn(HEIGHT_UNITS as readonly string[])
  height_unit?: HeightUnit;
}

export interface SettingsResponseDto {
  weight_unit: WeightUnit;
  height_unit: HeightUnit;
}
