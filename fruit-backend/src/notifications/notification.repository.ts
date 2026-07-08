import { Injectable } from '@nestjs/common';
import { PrismaService, clampPagination } from '@rubus/database';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<NotificationEntity> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const doc = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        ...(data ? { data } : {}),
        expiresAt,
      },
    });

    return this.toDomain(doc);
  }

  async findByUserPaginated(
    userId: string,
    pageParam: number,
    limitParam: number,
  ): Promise<{
    data: NotificationEntity[];
    total: number;
    page: number;
    limit: number;
    unreadCount: number;
  }> {
    const { page, limit, skip, take } = clampPagination(pageParam, limitParam);

    const [docs, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      data: docs.map((d) => this.toDomain(d)),
      total,
      page,
      limit,
      unreadCount,
    };
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private toDomain(doc: any): NotificationEntity {
    return new NotificationEntity(
      doc.id,
      doc.userId,
      doc.type,
      doc.title,
      doc.body,
      doc.data,
      doc.read,
      doc.createdAt,
      doc.expiresAt,
    );
  }
}
