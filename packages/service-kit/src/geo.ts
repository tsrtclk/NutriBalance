import { Prisma } from "@platform/prisma-client";

/**
 * PostGIS `$queryRaw` helpers. Prisma's client can't bind `geometry(...)`
 * columns, so geo repos round-trip geometry as GeoJSON and write geo-search
 * predicates by hand. These return composable `Prisma.Sql` fragments that
 * flatten into a tagged `$queryRaw` template, e.g.
 *
 *   prisma.$queryRaw`SELECT id, ${geo.asGeoJson('location')}
 *     FROM tools
 *     WHERE ${geo.withinKm('location', lat, lng, radiusKm)}
 *     ORDER BY ${geo.nearest('location', lat, lng)}`
 *
 * Column/alias args are hard-coded identifiers (never user input) → `Prisma.raw`.
 */
type GeoJson = { type: string; coordinates: unknown };

/** A WGS84 point as a geography, shared by the search fragments. */
function pointGeography(lat: number, lng: number): Prisma.Sql {
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
}

export const geo = {
  /** `ST_GeomFromGeoJSON(...)` for INSERT/UPDATE. Null-safe (NULL → NULL geom). */
  fromGeoJson(value: GeoJson | null | undefined): Prisma.Sql {
    return Prisma.sql`ST_GeomFromGeoJSON(${value ? JSON.stringify(value) : null})`;
  },

  /** `ST_AsGeoJSON(<col>)::json AS <alias>` for SELECT/RETURNING. */
  asGeoJson(column: string, alias: string = column): Prisma.Sql {
    return Prisma.sql`ST_AsGeoJSON(${Prisma.raw(column)})::json AS ${Prisma.raw(alias)}`;
  },

  /** `ST_DWithin(<col>::geography, <point>, radiusKm*1000)` search predicate. */
  withinKm(
    column: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Prisma.Sql {
    return Prisma.sql`ST_DWithin(${Prisma.raw(column)}::geography, ${pointGeography(lat, lng)}, ${radiusKm * 1000})`;
  },

  /** `ST_Distance(...) / 1000 AS <alias>` — distance in km from a point. */
  distanceKm(
    column: string,
    lat: number,
    lng: number,
    alias = "distance_km",
  ): Prisma.Sql {
    return Prisma.sql`ST_Distance(${Prisma.raw(column)}::geography, ${pointGeography(lat, lng)}) / 1000.0 AS ${Prisma.raw(alias)}`;
  },

  /** KNN distance operand for `ORDER BY` (nearest first). */
  nearest(column: string, lat: number, lng: number): Prisma.Sql {
    return Prisma.sql`${Prisma.raw(column)}::geography <-> ${pointGeography(lat, lng)}`;
  },
};
