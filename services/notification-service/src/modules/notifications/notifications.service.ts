import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EventBusService } from "@platform/events";

import { NotificationsRepository } from "./notifications.repository";
import { PUSH_PROVIDER, type PushProvider } from "./push/push.provider";
import type { ReminderMessage } from "./reminder-rules";
import type { NotificationResponseDto } from "./dto/notification-response.dto";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repo: NotificationsRepository,
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider,
    private readonly events: EventBusService,
  ) {}

  /**
   * Single dispatch path for scheduler + consumers: inbox row first
   * (deduped), then the best-effort side channels. Returns whether the
   * slot actually fired.
   */
  async dispatch(userId: string, message: ReminderMessage): Promise<boolean> {
    const isNew = await this.repo.createDeduped(userId, message);
    if (!isNew) return false;
    await this.push
      .send(userId, message.title, message.body)
      .catch(() => undefined);
    await this.events.publish("notification.sent", {
      user_id: userId,
      type: message.type,
      dedupe_key: message.dedupe_key,
    });
    return true;
  }

  list(
    userId: string,
    unreadOnly: boolean,
  ): Promise<NotificationResponseDto[]> {
    return this.repo.list(userId, unreadOnly);
  }

  async markRead(userId: string, id: string): Promise<NotificationResponseDto> {
    const notification = await this.repo.markRead(userId, id);
    if (!notification) {
      throw new NotFoundException({
        code: "NOTIFICATION_NOT_FOUND",
        message: "Notification not found",
      });
    }
    return notification;
  }
}
