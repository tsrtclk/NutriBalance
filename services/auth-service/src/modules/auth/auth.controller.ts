import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  Public,
  TransformInterceptor,
  type UserPayload,
} from "@platform/service-kit";

import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import type {
  AuthResponseDto,
  TokensDto,
  UserResponseDto,
} from "./dto/auth-response.dto";

@ApiTags("auth")
@Controller("auth")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  refresh(@Body() dto: RefreshDto): Promise<TokensDto> {
    return this.auth.refresh(dto.refresh_token);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  async logout(@CurrentUser() user: UserPayload): Promise<{ ok: true }> {
    await this.auth.logout(user);
    return { ok: true };
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser() user: UserPayload): Promise<UserResponseDto> {
    return this.auth.me(user.sub);
  }
}
