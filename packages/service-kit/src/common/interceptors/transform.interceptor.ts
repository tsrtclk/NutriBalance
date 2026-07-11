import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map, Observable } from "rxjs";

import type { ApiResponse } from "../dto/api-response.dto";

/**
 * Wraps every controller return value in the standard ApiResponse envelope.
 *
 * Controllers can return either:
 *   - a plain DTO → wrapped as `{ success: true, data }`
 *   - `{ data, meta }` → meta is passed through (for paginated lists)
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        if (
          value &&
          typeof value === "object" &&
          "data" in value &&
          "meta" in value
        ) {
          const { data, meta } = value as {
            data: T;
            meta: Record<string, unknown>;
          };
          return { success: true, data, meta };
        }
        return { success: true, data: value as T };
      }),
    );
  }
}
