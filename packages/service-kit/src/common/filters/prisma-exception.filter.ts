import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { Prisma } from "@platform/prisma-client";

import type { ApiResponse } from "../dto/api-response.dto";

/**
 * Translates Prisma-specific exceptions into proper HTTP status codes with
 * stable error codes, so callers get something better than 500.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "DB_ERROR";
    let message = "Veritabanı hatası";

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case "P2002":
          status = HttpStatus.CONFLICT;
          code = "CONFLICT_UNIQUE";
          message = "Bu kayıt zaten mevcut";
          break;
        case "P2025":
          status = HttpStatus.NOT_FOUND;
          code = "NOT_FOUND";
          message = "Kayıt bulunamadı";
          break;
        case "P2003":
          status = HttpStatus.BAD_REQUEST;
          code = "FK_CONSTRAINT";
          message = "Bağlı kayıt mevcut değil";
          break;
        default:
          this.logger.error(
            `Prisma error ${exception.code}: ${exception.message}`,
          );
      }
    }

    const body: ApiResponse<never> = {
      success: false,
      error: { code, message },
    };
    response.status(status).json(body);
  }
}
