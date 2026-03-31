import {
  Injectable,
  Logger,
  NotFoundException,
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

@Injectable()
export class SolicitudesService {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(
    @InjectModel(SolicitudMuestreo.name)
    private readonly solicitudModel: Model<SolicitudMuestreoDocument>,
    private readonly notificationsGateway: NotificationsGateway,
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

    return solicitud;
  }

  async findAll(
    page = 1,
    limit = 20,
    filters: { estado?: EstadoSolicitud; campo_id?: string; asignado_a?: string } = {},
  ): Promise<{ data: SolicitudMuestreoDocument[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.estado)      query.estado    = filters.estado;
    if (filters.campo_id)    query.campo_id  = new Types.ObjectId(filters.campo_id);
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
    return updated;
  }
}
