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

import { PreferencesRepository } from "./preferences.repository";
import {
  UpdatePreferencesDto,
  type PreferencesResponseDto,
} from "./dto/preferences-dtos";

// Thin CRUD — the repository is the only layer needed for a settings row.
@ApiTags("notification-preferences")
@ApiBearerAuth()
@Controller("notification-preferences")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class PreferencesController {
  constructor(private readonly preferences: PreferencesRepository) {}

  @Get()
  get(@CurrentUser() user: UserPayload): Promise<PreferencesResponseDto> {
    return this.preferences.get(user.sub);
  }

  @Put()
  update(
    @CurrentUser() user: UserPayload,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<PreferencesResponseDto> {
    return this.preferences.upsert(user.sub, dto);
  }
}
