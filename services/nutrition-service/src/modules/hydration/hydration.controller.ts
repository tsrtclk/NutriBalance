import {
  Body,
  Controller,
  Delete,
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

import { HydrationService } from "./hydration.service";
import {
  CreateHydrationEntryDto,
  type HydrationDayResponseDto,
  type HydrationEntryResponseDto,
} from "./dto/hydration-dtos";

@ApiTags("hydration")
@ApiBearerAuth()
@Controller("hydration")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class HydrationController {
  constructor(private readonly hydration: HydrationService) {}

  @Post()
  log(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateHydrationEntryDto,
  ): Promise<HydrationEntryResponseDto> {
    return this.hydration.log(user.sub, dto);
  }

  @Get()
  day(
    @CurrentUser() user: UserPayload,
    @Query("date") date?: string,
  ): Promise<HydrationDayResponseDto> {
    return this.hydration.day(user.sub, date);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.hydration.remove(user.sub, id);
  }
}
