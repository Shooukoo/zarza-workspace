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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
    description:
      'Returns the authenticated user notifications with pagination and unread count.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
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
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Marks all notifications belonging to the authenticated user as read.',
  })
  @ApiResponse({
    status: 204,
    description: 'All notifications marked as read successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  async markAllRead(@Req() req: any): Promise<void> {
    await this.service.markAllRead(req.user.sub);
  }

  @Patch(':id/read')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Mark notification as read',
    description:
      'Marks a specific notification belonging to the authenticated user as read.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID.',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Notification marked as read successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found.',
  })
  async markRead(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.service.markRead(id, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete notification',
    description:
      'Deletes a specific notification belonging to the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID.',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found.',
  })
  async deleteNotification(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    await this.service.delete(id, req.user.sub);
  }
}
