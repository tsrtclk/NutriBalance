import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Default guard for any non-@Public route.
 *
 * Validates the bearer token via the 'jwt-access' Passport strategy.
 * Attaches UserPayload to req.user on success.
 *
 * Bypassed entirely for @Public-decorated handlers (registration, OTP request).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt-access") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<T>(err: Error | null, user: T): T {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        })
      );
    }
    return user;
  }
}
