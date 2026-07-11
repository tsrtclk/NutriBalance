import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { Observable, tap } from "rxjs";

import { PrismaService } from "../../prisma/prisma.service";
import type { UserPayload } from "../interfaces/user-payload.interface";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SENSITIVE_PATHS = new Set([
  "password",
  "pin",
  "national_id",
  "national_id_plain",
  "card_details",
  "token",
  "auth_token",
  "refresh_token",
  "secret",
  "api_key",
]);

/**
 * Append-only audit log for every mutating request.
 *
 * Persists to audit_logs (partition-friendly composite PK).
 * Drops sensitive fields from the payload before storing.
 * Never throws — audit failures must not break the user's request.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const user = (request as Request & { user?: UserPayload }).user;
    const action = `${method} ${request.route?.path ?? request.url}`;
    const ip = (request.ip ?? request.socket.remoteAddress ?? null) as
      string | null;
    const userAgent = request.get("user-agent") ?? null;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.write(
            user,
            action,
            request.params,
            this.scrub(request.body),
            ip,
            userAgent,
          );
        },
        error: () => {
          void this.write(
            user,
            `${action} [FAILED]`,
            request.params,
            this.scrub(request.body),
            ip,
            userAgent,
          );
        },
      }),
    );
  }

  private async write(
    user: UserPayload | undefined,
    action: string,
    params: Record<string, string>,
    body: unknown,
    ip: string | null,
    userAgent: string | null,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: user?.sub,
          action,
          resource_type: this.resourceTypeFrom(action),
          resource_id: params?.id,
          ip_address: ip,
          user_agent: userAgent,
          changes: body as object,
        },
      });
    } catch (err) {
      this.logger.warn(`Audit write failed: ${(err as Error).message}`);
    }
  }

  private resourceTypeFrom(action: string): string {
    const segments = action.split(" ")[1]?.split("/").filter(Boolean) ?? [];
    return segments[2] ?? segments[0] ?? "unknown";
  }

  private scrub(payload: unknown): unknown {
    if (!payload || typeof payload !== "object") return payload;
    if (Array.isArray(payload)) return payload.map((p) => this.scrub(p));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      out[k] = SENSITIVE_PATHS.has(k) ? "[REDACTED]" : this.scrub(v);
    }
    return out;
  }
}
