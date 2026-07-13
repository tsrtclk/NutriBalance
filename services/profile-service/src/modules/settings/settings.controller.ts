import {
  Body,
  Controller,
  Get,
  Put,
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

import { SettingsRepository } from "./settings.repository";
import {
  UpdateSettingsDto,
  type SettingsResponseDto,
} from "./dto/settings-dtos";

/** É12 — display units (D13: the API stays metric; clients render). */
@ApiTags("settings")
@ApiBearerAuth()
@Controller("settings")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class SettingsController {
  constructor(private readonly settings: SettingsRepository) {}

  @Get()
  get(@CurrentUser() user: UserPayload): Promise<SettingsResponseDto> {
    return this.settings.get(user.sub);
  }

  @Put()
  update(
    @CurrentUser() user: UserPayload,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    return this.settings.upsert(user.sub, dto);
  }
}
