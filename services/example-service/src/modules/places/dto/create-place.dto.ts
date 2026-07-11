import { IsObject, IsString, Length } from "class-validator";
import type { GeoJsonPoint } from "@platform/shared-types";

/** Example create DTO. The owner is taken from the JWT, never the body. */
export class CreatePlaceDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsObject()
  location!: GeoJsonPoint;
}
