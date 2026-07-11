import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "platform:is_public";

/** Skip JwtAuthGuard for this endpoint (registration, OTP, healthcheck). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
