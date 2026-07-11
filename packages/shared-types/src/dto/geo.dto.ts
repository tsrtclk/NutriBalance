/** GeoJSON wire types. Backends convert to/from PostGIS geometry(...) via
 * ST_GeomFromGeoJSON / ST_AsGeoJSON (see @platform/service-kit `geo` helper). */
export interface GeoJsonPoint {
  type: "Point";
  /** [lng, lat] */
  coordinates: [number, number];
}

export interface GeoJsonPolygon {
  type: "Polygon";
  /** [[ [lng, lat], ... ]] — first ring is the outer boundary */
  coordinates: number[][][];
}
