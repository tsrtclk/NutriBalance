import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  HttpExceptionFilter,
  JwtAuthGuard,
  PrismaExceptionFilter,
  TransformInterceptor,
  type UserPayload,
} from "@platform/service-kit";

import { NotificationsService } from "./notifications.service";
import type { NotificationResponseDto } from "./dto/notification-response.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query("unread") unread?: string,
  ): Promise<NotificationResponseDto[]> {
    return this.notifications.list(user.sub, unread === "true");
  }

  @Post(":id/read")
  @HttpCode(HttpStatus.OK)
  markRead(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<NotificationResponseDto> {
    return this.notifications.markRead(user.sub, id);
  }
}
