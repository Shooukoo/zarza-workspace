import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationRepository } from './notification.repository';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<NotificationEntity> {
    const notification = await this.repository.create(
      userId,
      type,
      title,
      body,
      data,
    );
    // Envía WS inmediatamente
    this.gateway.emitToUser(userId, type, data);
    return notification;
  }

  async findForUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: NotificationEntity[];
    total: number;
    page: number;
    limit: number;
    unreadCount: number;
  }> {
    return this.repository.findByUserPaginated(userId, page, limit);
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repository.markRead(id, userId);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repository.markAllRead(userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.repository.delete(id, userId);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpired(): Promise<void> {
    const count = await this.repository.deleteExpired();
    this.logger.log(`[Cron] Cleaned up ${count} expired notifications`);
  }
}
