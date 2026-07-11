import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "platform:roles";

/**
 * Restrict an endpoint to specific RBAC roles within a cooperative.
 * Example: `@Roles('board_member', 'treasurer')` — passes if user has either.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
