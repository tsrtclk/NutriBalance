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

import { SupplementsService } from "./supplements.service";
import {
  CreateSupplementDto,
  LogIntakeDto,
  type SupplementIntakeResponseDto,
  type SupplementResponseDto,
} from "./dto/supplement-dtos";

@ApiTags("supplements")
@ApiBearerAuth()
@Controller("supplements")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class SupplementsController {
  constructor(private readonly supplements: SupplementsService) {}

  @Post()
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateSupplementDto,
  ): Promise<SupplementResponseDto> {
    return this.supplements.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: UserPayload): Promise<SupplementResponseDto[]> {
    return this.supplements.list(user.sub);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.supplements.deactivate(user.sub, id);
  }

  @Post(":id/intake")
  logIntake(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: LogIntakeDto,
  ): Promise<SupplementIntakeResponseDto> {
    return this.supplements.logIntake(user.sub, id, dto);
  }

  @Get(":id/intakes")
  intakes(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<SupplementIntakeResponseDto[]> {
    return this.supplements.intakes(user.sub, id);
  }
}
