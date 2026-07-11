import {
  Body,
  Controller,
  Get,
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

import { WeightService } from "./weight.service";
import { CreateWeightEntryDto } from "./dto/create-weight-entry.dto";
import type { WeightEntryResponseDto } from "./dto/weight-entry-response.dto";

@ApiTags("weight")
@ApiBearerAuth()
@Controller("weight-entries")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class WeightController {
  constructor(private readonly weight: WeightService) {}

  @Post()
  log(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateWeightEntryDto,
  ): Promise<WeightEntryResponseDto> {
    return this.weight.log(user.sub, dto);
  }

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<WeightEntryResponseDto[]> {
    return this.weight.list(user.sub, from, to);
  }
}
