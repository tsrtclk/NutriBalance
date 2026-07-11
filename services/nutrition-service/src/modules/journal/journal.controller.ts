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

import { JournalService } from "./journal.service";
import { CreateJournalEntryDto } from "./dto/create-journal-entry.dto";
import type {
  JournalDayResponseDto,
  JournalEntryResponseDto,
} from "./dto/journal-response.dto";

@ApiTags("journal")
@ApiBearerAuth()
@Controller("journal")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Post()
  log(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateJournalEntryDto,
  ): Promise<JournalEntryResponseDto> {
    return this.journal.log(user.sub, dto);
  }

  @Get()
  day(
    @CurrentUser() user: UserPayload,
    @Query("date") date?: string,
  ): Promise<JournalDayResponseDto> {
    return this.journal.day(user.sub, date);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.journal.remove(user.sub, id);
  }
}
