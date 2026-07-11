import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { MIN_AUTH_LEVEL_KEY } from "../decorators/min-auth-level.decorator";
import type { UserPayload } from "../interfaces/user-payload.interface";

/**
 * Enforces a minimum verification level on a handler.
 *
 * Default behavior when no @MinAuthLevel decorator is present: requires
 * level 1 (PHONE_VERIFIED) — guests can only hit @Public endpoints.
 *
 *   0 GUEST          → @Public only
 *   1 PHONE_VERIFIED → default
 *   2 COOP_VERIFIED  → @MinAuthLevel(2)
 *   3 ID_VERIFIED    → @MinAuthLevel(3)
 *   4 BUSINESS       → @MinAuthLevel(4)
 */
@Injectable()
export class AuthLevelGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // @Public routes have no authenticated user, so they must bypass the
    // level check entirely — otherwise the default level-1 requirement 403s
    // every public endpoint.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required =
      this.reflector.getAllAndOverride<number>(MIN_AUTH_LEVEL_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 1;

    if (required === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserPayload | undefined;
    if (!user) {
      throw new ForbiddenException({
        code: "AUTH_LEVEL_REQUIRED",
        message: "Yetersiz doğrulama seviyesi",
      });
    }

    if (user.authLevel < required) {
      throw new ForbiddenException({
        code: "AUTH_LEVEL_TOO_LOW",
        message: `Bu işlem için seviye ${required} doğrulama gereklidir`,
        details: { required, current: user.authLevel },
      });
    }
    return true;
  }
}
