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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { buildPaginated } from '@rubus/database';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async getNotifications(@Req() req: any, @Query() query: PaginationQueryDto) {
    const { data, total, page, limit, unreadCount } =
      await this.service.findForUser(req.user.sub, query.page, query.limit);

    return {
      ...buildPaginated(
        data.map((n) => ({
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
        page,
        limit,
      ),
      unreadCount,
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
  async deleteNotification(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    await this.service.delete(id, req.user.sub);
  }
}
