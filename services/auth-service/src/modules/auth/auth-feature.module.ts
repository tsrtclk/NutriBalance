import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersRepository } from "./users.repository";

// Named AuthFeatureModule to avoid clashing with the kit's verify-only
// AuthModule. JwtModule is registered bare: secrets/TTLs are passed per-sign
// from the typed config, never globally.
@Module({
  imports: [JwtModule.register({}), PrismaModule, AuthModule],
  controllers: [AuthController],
  providers: [AuthService, UsersRepository],
})
export class AuthFeatureModule {}
