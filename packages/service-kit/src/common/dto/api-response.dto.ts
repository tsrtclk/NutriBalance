/**
 * Standard API response envelope.
 *
 * Defined in platform-nestjs-backend skill — all controllers should return this
 * shape via TransformInterceptor (success path) or HttpExceptionFilter (error).
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    total?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
