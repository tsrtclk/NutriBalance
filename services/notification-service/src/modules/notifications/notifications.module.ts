import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { NotificationsController } from "./notifications.controller";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";
import { PUSH_PROVIDER } from "./push/push.provider";
import { MockPushProvider } from "./push/mock-push.provider";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    // backlog: D6 — mock push until a vendor + device tokens land (B17).
    { provide: PUSH_PROVIDER, useClass: MockPushProvider },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
