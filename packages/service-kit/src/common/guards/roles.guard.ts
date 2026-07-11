import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "../decorators/roles.decorator";
import type { UserPayload } from "../interfaces/user-payload.interface";

/**
 * RBAC role guard.
 *
 * Passes when the user has at least one of the roles listed in @Roles(...).
 *
 * Roles come from `cooperative_members.role` and are denormalized into the
 * JWT at issue time (see SessionsService.issueAccessToken).
 *
 * Valid roles (matches the CHECK constraint on cooperative_members.role):
 *   member · board_member · treasurer · secretary · president · admin
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest().user as
      UserPayload | undefined;
    if (!user) {
      throw new ForbiddenException({
        code: "AUTH_REQUIRED",
        message: "Oturum açmalısınız",
      });
    }

    const has = required.some((r) => user.roles.includes(r));
    if (!has) {
      throw new ForbiddenException({
        code: "ROLE_REQUIRED",
        message: "Bu işlem için yetkiniz yok",
        details: { required, current: user.roles },
      });
    }
    return true;
  }
}
