import {
  Body,
  Controller,
  Get,
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

import { PlacesService } from "./places.service";
import { CreatePlaceDto } from "./dto/create-place.dto";
import type { PlaceResponseDto } from "./dto/place-response.dto";

@ApiTags("places")
@ApiBearerAuth()
@Controller("places")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Post()
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreatePlaceDto,
  ): Promise<PlaceResponseDto> {
    return this.places.create(user.sub, dto.name, dto.location);
  }

  /** Places near a point, nearest first. */
  @Get("nearby")
  nearby(
    @Query("lat") lat: string,
    @Query("lng") lng: string,
    @Query("radius_km") radiusKm?: string,
  ): Promise<PlaceResponseDto[]> {
    return this.places.nearby(
      Number(lat),
      Number(lng),
      radiusKm ? Number(radiusKm) : 10,
    );
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<PlaceResponseDto> {
    return this.places.findOne(id);
  }
}
