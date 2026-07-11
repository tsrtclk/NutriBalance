import { Injectable } from "@nestjs/common";
import { geo, PrismaService } from "@platform/service-kit";
import type { GeoJsonPoint } from "@platform/shared-types";

import type { PlaceResponseDto } from "./dto/place-response.dto";

/** Raw-SQL gateway: `location` is geometry(Point,4326), so it round-trips via
 * the `geo` helper (the canonical pattern for geo tables). */
@Injectable()
export class PlacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    name: string,
    location: GeoJsonPoint,
  ): Promise<PlaceResponseDto> {
    const rows = await this.prisma.$queryRaw<RawRow[]>`
      INSERT INTO places (owner_id, name, location)
      VALUES (${ownerId}::uuid, ${name}, ${geo.fromGeoJson(location)})
      RETURNING id, owner_id, name, ${geo.asGeoJson("location")}, created_at, updated_at
    `;
    return this.toDto(rows[0]);
  }

  async findNear(
    lat: number,
    lng: number,
    radiusKm: number,
    limit = 50,
  ): Promise<PlaceResponseDto[]> {
    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT id, owner_id, name, ${geo.asGeoJson("location")}, created_at, updated_at,
        ${geo.distanceKm("location", lat, lng)}
      FROM places
      WHERE ${geo.withinKm("location", lat, lng, radiusKm)}
      ORDER BY ${geo.nearest("location", lat, lng)}
      LIMIT ${limit}
    `;
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string): Promise<PlaceResponseDto | null> {
    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT id, owner_id, name, ${geo.asGeoJson("location")}, created_at, updated_at
      FROM places WHERE id = ${id}::uuid LIMIT 1
    `;
    return rows[0] ? this.toDto(rows[0]) : null;
  }

  private toDto(r: RawRow): PlaceResponseDto {
    return {
      id: r.id,
      owner_id: r.owner_id,
      name: r.name,
      location: r.location,
      created_at: r.created_at,
      updated_at: r.updated_at,
      ...(r.distance_km != null ? { distance_km: Number(r.distance_km) } : {}),
    };
  }
}

interface RawRow {
  id: string;
  owner_id: string;
  name: string;
  location: GeoJsonPoint;
  created_at: Date;
  updated_at: Date;
  distance_km?: number | null;
}
