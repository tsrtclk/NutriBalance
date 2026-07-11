import { Global, Module } from "@nestjs/common";

import { EventBusService } from "./event-bus.service";

/**
 * Global so any provider can inject {@link EventBusService} once a service
 * imports this module in its AppModule. Relies on a global ConfigModule.
 */
@Global()
@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
