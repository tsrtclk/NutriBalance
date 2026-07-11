import type { GeoJsonPoint } from "@platform/shared-types";

export class PlaceResponseDto {
  id!: string;
  owner_id!: string;
  name!: string;
  location!: GeoJsonPoint;
  created_at!: Date;
  updated_at!: Date;
  /** Caller distance in km — set by the nearby query. */
  distance_km?: number;
}
