import { Injectable, Logger, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService, EstadoSolicitud } from '@rubus/database';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { FcmService, FcmTokenInvalidError, FcmNotification } from '../fcm/fcm.service';
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';
import { CamposService } from '../campos/campos.service';

@Injectable()
export class SolicitudesService {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly fcmService: FcmService,
    @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly camposService: CamposService,
  ) {}

  async create(creadoPorId: string, dto: CreateSolicitudDto) {
    this.logger.log(
      `Creando solicitud para campo=${dto.campo_id} asignado_a=${dto.asignado_a}`,
    );

    const solicitud = await this.prisma.solicitudMuestreo.create({
      data: {
        creadoPorId,
        asignadoAId: dto.asignado_a,
        campoId: dto.campo_id,
        mensaje: dto.mensaje,
        fechaLimite: dto.fecha_limite ? new Date(dto.fecha_limite) : null,
        estado: 'PENDIENTE',
      },
    });

    this.notificationsGateway.broadcast('nueva_solicitud', {
      solicitud_id: solicitud.id,
      asignado_a: dto.asignado_a,
      campo_id: dto.campo_id,
      mensaje: dto.mensaje,
    });

    await this.sendSolicitudPush(dto.asignado_a, dto.campo_id, dto.fecha_limite ?? null, 'created');
    return solicitud;
  }

  async findAll(
    page = 1,
    limit = 20,
    filters: { estado?: EstadoSolicitud; campo_id?: string; asignado_a?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where: { estado?: EstadoSolicitud; campoId?: string; asignadoAId?: string } = {};

    if (filters.estado)    where.estado     = filters.estado;
    if (filters.campo_id)  where.campoId    = filters.campo_id;
    if (filters.asignado_a) where.asignadoAId = filters.asignado_a;

    const include = {
      campo:    { select: { id: true, nombre: true, codigoCampo: true } },
      asignadoA: { select: { id: true, email: true } },
    };

    const [data, total] = await Promise.all([
      this.prisma.solicitudMuestreo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include,
      }),
      this.prisma.solicitudMuestreo.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async updateEstado(id: string, estado: EstadoSolicitud, requesterId?: string, requesterRole?: string) {
    const existing = await this.prisma.solicitudMuestreo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Solicitud con id "${id}" no encontrada`);

    if (requesterRole === 'MONITOR' && existing.asignadoAId !== requesterId) {
      throw new ForbiddenException('Solo puedes modificar solicitudes asignadas a ti');
    }

    const updated = await this.prisma.solicitudMuestreo.update({
      where: { id },
      data: { estado },
      include: {
        campo:    { select: { id: true, nombre: true, codigoCampo: true } },
        asignadoA: { select: { id: true, email: true } },
      },
    });

    this.logger.log(`Solicitud ${id} → estado: ${estado}`);

    if (estado === 'CANCELADO' || estado === 'COMPLETADO') {
      await this.sendSolicitudPush(
        updated.asignadoAId,
        updated.campoId,
        null,
        estado === 'CANCELADO' ? 'cancelled' : 'completed',
      );
    }

    return updated;
  }

  private async sendSolicitudPush(
    userId: string | undefined | null,
    campoId: string | undefined | null,
    fechaLimite: string | Date | null | undefined,
    event: 'created' | 'cancelled' | 'completed',
  ): Promise<void> {
    this.logger.log(`[FCM] sendSolicitudPush → event=${event} userId=${userId ?? 'none'}`);
    if (!userId) return;

    const fcmToken = await this.userRepository.findFcmTokenById(userId);
    if (!fcmToken) {
      this.logger.warn(`[FCM] Monitor ${userId} sin token registrado`);
      return;
    }

    let campoNombre: string = campoId ?? 'desconocido';
    if (campoId) {
      try {
        const campo = await this.camposService.findById(campoId);
        campoNombre = campo.nombre;
      } catch {
        // campo no encontrado, se usa campoId como fallback
      }
    }

    const formatFecha = (fl: string | Date | null | undefined): string => {
      if (!fl) return 'sin fecha';
      const iso = fl instanceof Date ? fl.toISOString() : fl.toString();
      const datePart = iso.slice(0, 10); // "YYYY-MM-DD"
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year}`;
    };

    const notifications: Record<typeof event, FcmNotification> = {
      created: {
        title: `Nueva solicitud: ${campoNombre}`,
        body: `Fecha límite: ${formatFecha(fechaLimite)}. Abre la app para ver detalles.`,
      },
      cancelled: {
        title: `Solicitud cancelada: ${campoNombre}`,
        body: 'La solicitud de muestreo fue cancelada.',
      },
      completed: {
        title: `Solicitud completada: ${campoNombre}`,
        body: 'El análisis ha sido marcado como completado.',
      },
    };

    try {
      await this.fcmService.sendToDevice(fcmToken, notifications[event]);
    } catch (e) {
      if (e instanceof FcmTokenInvalidError) {
        await this.userRepository.clearFcmToken(userId);
        this.logger.log(`[FCM] Token inválido limpiado para usuario ${userId}`);
      }
    }
  }
}
