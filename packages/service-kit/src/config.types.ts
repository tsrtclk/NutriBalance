/**
 * The slice of a service's config that the kit's Redis + auth providers read.
 * Each service's own `configuration.ts` is a superset of this (plus its own
 * port, db, s3, etc.), so `ConfigService<ServiceKitConfig, true>` infers here.
 */
export interface ServiceKitConfig {
  redis: { url: string; keyPrefix: string };
  jwt: { accessSecret: string; issuer: string };
}
