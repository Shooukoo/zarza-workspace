import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SolicitudMuestreo,
  SolicitudMuestreoDocument,
  SolicitudMuestreoHydratedDocument,
  EstadoSolicitud,
} from './schemas/solicitud-muestreo.schema';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { FcmService, FcmTokenInvalidError, FcmNotification } from '../fcm/fcm.service';
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';
import { CamposService } from '../campos/campos.service';

@Injectable()
export class SolicitudesService {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(
    @InjectModel(SolicitudMuestreo.name)
    private readonly solicitudModel: Model<SolicitudMuestreoDocument>,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly fcmService: FcmService,
    @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly camposService: CamposService,
  ) {}

  async create(
    creadoPorId: string,
    dto: CreateSolicitudDto,
  ): Promise<SolicitudMuestreoHydratedDocument> {
    this.logger.log(
      `Creando solicitud para campo=${dto.campo_id} asignado_a=${dto.asignado_a}`,
    );

    const solicitud = await this.solicitudModel.create({
      creado_por: new Types.ObjectId(creadoPorId),
      asignado_a: new Types.ObjectId(dto.asignado_a),
      campo_id:   new Types.ObjectId(dto.campo_id),
      mensaje:    dto.mensaje,
      fecha_limite: dto.fecha_limite ? new Date(dto.fecha_limite) : null,
      estado: 'PENDIENTE',
    });

    // Notificar via WebSocket a los clientes conectados (el monitor verá la alerta)
    this.notificationsGateway.broadcast('nueva_solicitud', {
      solicitud_id: (solicitud._id as Types.ObjectId).toString(),
      asignado_a:   dto.asignado_a,
      campo_id:     dto.campo_id,
      mensaje:      dto.mensaje,
    });

    await this.sendSolicitudPush(
      dto.asignado_a,
      dto.campo_id,
      dto.fecha_limite ?? null,
      'created',
    );

    return solicitud;
  }

  async findAll(
    page = 1,
    limit = 20,
    filters: { estado?: EstadoSolicitud; campo_id?: string; asignado_a?: string } = {},
  ): Promise<{ data: SolicitudMuestreoDocument[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const query: {
      estado?: EstadoSolicitud;
      campo_id?: Types.ObjectId;
      asignado_a?: Types.ObjectId;
    } = {};

    if (filters.estado)      query.estado     = filters.estado;
    if (filters.campo_id)    query.campo_id   = new Types.ObjectId(filters.campo_id);
    if (filters.asignado_a)  query.asignado_a = new Types.ObjectId(filters.asignado_a);

    const [data, total] = await Promise.all([
      this.solicitudModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<SolicitudMuestreoDocument[]>()
        .exec(),
      this.solicitudModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async updateEstado(
    id: string,
    estado: EstadoSolicitud,
  ): Promise<SolicitudMuestreoDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Solicitud con id "${id}" no encontrada`);
    }

    const updated = await this.solicitudModel
      .findByIdAndUpdate(id, { $set: { estado } }, { new: true })
      .lean<SolicitudMuestreoDocument>()
      .exec();

    if (!updated) {
      throw new NotFoundException(`Solicitud con id "${id}" no encontrada`);
    }

    this.logger.log(`Solicitud ${id} → estado: ${estado}`);

    if (estado === 'CANCELADO' || estado === 'COMPLETADO') {
      await this.sendSolicitudPush(
        updated.asignado_a?.toString(),
        updated.campo_id?.toString(),
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
      // Parse as local date to avoid UTC offset shifting the day
      const d = fl instanceof Date ? fl : new Date(fl.toString().replace(/-/g, '/'));
      return d.toLocaleDateString('es-ES');
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
