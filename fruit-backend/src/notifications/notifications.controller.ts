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
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('Notifications')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener notificaciones de usuario',
    description:
      'Devuelve las notificaciones del usuario autenticado con paginación y el recuento de notificaciones no leídas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones recuperadas correctamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
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
    summary: 'Marcar todas las notificaciones como leídas',
    description:
      'Marca como leídas todas las notificaciones pertenecientes al usuario autenticado.',
  })
  @ApiResponse({
    status: 204,
    description: 'Todas las notificaciones se han marcado como leídas correctamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  async markAllRead(@Req() req: any): Promise<void> {
    await this.service.markAllRead(req.user.sub);
  }

  @Patch(':id/read')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Marcar notificación como leída',
    description:
      'Marca como leída una notificación específica perteneciente al usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la notificación.',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Notificación marcada como leída correctamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró la notificación.',
  })
  async markRead(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.service.markRead(id, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Eliminar notificación',
    description:
      'Elimina una notificación específica perteneciente al usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la notificación.',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Notificación eliminada correctamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró la notificación.',
  })
  async deleteNotification(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    await this.service.delete(id, req.user.sub);
  }
}
