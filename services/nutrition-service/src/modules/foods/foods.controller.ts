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

import { FoodsService } from "./foods.service";
import { CreateFoodDto } from "./dto/create-food.dto";
import type { FoodResponseDto } from "./dto/food-response.dto";

@ApiTags("foods")
@ApiBearerAuth()
@Controller("foods")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class FoodsController {
  constructor(private readonly foods: FoodsService) {}

  @Get("search")
  search(
    @CurrentUser() user: UserPayload,
    @Query("q") q: string,
  ): Promise<FoodResponseDto[]> {
    return this.foods.search(user.sub, (q ?? "").trim());
  }

  @Get("favorites")
  favorites(@CurrentUser() user: UserPayload): Promise<FoodResponseDto[]> {
    return this.foods.favorites(user.sub);
  }

  @Get("recent")
  recent(@CurrentUser() user: UserPayload): Promise<FoodResponseDto[]> {
    return this.foods.recent(user.sub);
  }

  @Get("barcode/:code")
  byBarcode(@Param("code") code: string): Promise<FoodResponseDto> {
    return this.foods.byBarcode(code);
  }

  @Post()
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateFoodDto,
  ): Promise<FoodResponseDto> {
    return this.foods.createCustom(user.sub, dto);
  }

  @Post(":id/favorite")
  @HttpCode(HttpStatus.NO_CONTENT)
  async addFavorite(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.foods.addFavorite(user.sub, id);
  }

  @Delete(":id/favorite")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.foods.removeFavorite(user.sub, id);
  }
}
