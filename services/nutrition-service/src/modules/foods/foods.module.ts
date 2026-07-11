import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import type { AppConfig } from "../../config/configuration";
import { FoodsController } from "./foods.controller";
import { FoodsRepository } from "./foods.repository";
import { FoodsService } from "./foods.service";
import { FOOD_DATA_PROVIDER } from "./provider/food-data.provider";
import { MockFoodProvider } from "./provider/mock-food.provider";
import { OpenFoodFactsProvider } from "./provider/openfoodfacts.provider";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FoodsController],
  providers: [
    FoodsService,
    FoodsRepository,
    MockFoodProvider,
    OpenFoodFactsProvider,
    {
      // backlog: D3 — swappable provider binding (mock in dev/CI, OFF in prod).
      provide: FOOD_DATA_PROVIDER,
      inject: [ConfigService, MockFoodProvider, OpenFoodFactsProvider],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        mock: MockFoodProvider,
        off: OpenFoodFactsProvider,
      ) =>
        config.get("foodProvider", { infer: true }) === "openfoodfacts"
          ? off
          : mock,
    },
  ],
  exports: [FoodsRepository],
})
export class FoodsModule {}
