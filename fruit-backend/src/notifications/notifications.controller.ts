import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationEntity } from './notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const { items, total, unreadCount } = await this.service.findForUser(
      req.user.sub,
      parseInt(page, 10),
      parseInt(limit, 10),
    );

    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: n.read,
        createdAt: n.createdAt,
        expiresAt: n.expiresAt,
      })),
      total,
      unreadCount,
      page: parseInt(page, 10),
    };
  }

  @Patch('read-all')
  @HttpCode(204)
  async markAllRead(@Req() req: any): Promise<void> {
    await this.service.markAllRead(req.user.sub);
  }

  @Patch(':id/read')
  @HttpCode(204)
  async markRead(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.service.markRead(id, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteNotification(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.service.delete(id, req.user.sub);
  }
}
