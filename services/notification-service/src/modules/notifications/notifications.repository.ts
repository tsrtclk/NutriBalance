import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { Notification } from "@platform/prisma-client";

import type { ReminderMessage } from "./reminder-rules";
import type { NotificationResponseDto } from "./dto/notification-response.dto";

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Insert unless the (user, dedupe_key) slot already fired; true = new. */
  async createDeduped(
    userId: string,
    message: ReminderMessage,
  ): Promise<boolean> {
    const result = await this.prisma.notification.createMany({
      data: {
        user_id: userId,
        type: message.type,
        title: message.title,
        body: message.body,
        dedupe_key: message.dedupe_key,
      },
      skipDuplicates: true,
    });
    return result.count === 1;
  }

  async list(
    userId: string,
    unreadOnly: boolean,
    limit = 50,
  ): Promise<NotificationResponseDto[]> {
    const rows = await this.prisma.notification.findMany({
      where: { user_id: userId, ...(unreadOnly ? { read_at: null } : {}) },
      orderBy: { sent_at: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toDto(r));
  }

  async markRead(
    userId: string,
    id: string,
  ): Promise<NotificationResponseDto | null> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
    if (count === 0) {
      const existing = await this.prisma.notification.findFirst({
        where: { id, user_id: userId },
      });
      return existing ? this.toDto(existing) : null;
    }
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return row ? this.toDto(row) : null;
  }

  private toDto(row: Notification): NotificationResponseDto {
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      body: row.body,
      sent_at: row.sent_at,
      read_at: row.read_at,
    };
  }
}
