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

import { ProfileService } from "./profile.service";
import { UpsertProfileDto } from "./dto/upsert-profile.dto";
import type { ProfileResponseDto } from "./dto/profile-response.dto";

@ApiTags("profile")
@ApiBearerAuth()
@Controller("profile")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Put()
  upsert(
    @CurrentUser() user: UserPayload,
    @Body() dto: UpsertProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profile.upsert(user.sub, dto);
  }

  @Get()
  get(@CurrentUser() user: UserPayload): Promise<ProfileResponseDto> {
    return this.profile.get(user.sub);
  }

  @Get("targets")
  targets(@CurrentUser() user: UserPayload) {
    return this.profile.targets(user.sub);
  }
}
