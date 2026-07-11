import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { UserPayload } from "../interfaces/user-payload.interface";

/**
 * Extract the authenticated user attached by JwtAuthGuard.
 * Usage: `async meEndpoint(@CurrentUser() user: UserPayload) {}`
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserPayload;
  },
);
