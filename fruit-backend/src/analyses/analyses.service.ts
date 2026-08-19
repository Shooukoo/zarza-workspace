import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  PrismaService,
  Prisma,
  clampPagination,
  buildPaginated,
} from '@rubus/database';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { CreateDetectionDto } from './dto/create-detection.dto';
import { DetectionFeedbackDto } from './dto/detection-feedback.dto';
import { resolveDetectionState } from './detection-state.util';
import { STORAGE_PORT, type IStoragePort } from '../storage/ports';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { Role } from '../auth/domain/enums/role.enum';
import { AppLogger } from '../common/logging/app.logger';
import { RedisCacheService } from '../cache/redis-cache.service';

@Injectable()
export class AnalysesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT)
    private readonly storage: IStoragePort,
    private readonly logger: AppLogger,
    private readonly cache: RedisCacheService,
  ) {}

  async findAll(
    pageParam: number,
    limitParam: number,
    estado: 'pendiente' | 'validado' | 'rechazado' | 'all',
    scope: UserScope,
    campoId?: string,
    revisionDetecciones?: 'pendiente' | 'revisado' | 'all',
  ) {
    const { page, limit, skip, take } = clampPagination(pageParam, limitParam);
    const where: Record<string, unknown> = {};

    if (estado !== 'all') {
      where.validacionEstado = estado;
    }

    if (revisionDetecciones && revisionDetecciones !== 'all') {
      where.deteccionesRevisadas = revisionDetecciones === 'revisado';
    }

    if (scope.role === Role.PRODUCTOR) {
      where.productorId = scope.sub;
    }
    if (scope.role === Role.AGRONOMO && scope.camposAsignados?.length) {
      where.campoId = { in: scope.camposAsignados };
    }

    if (campoId) {
      where.campoId = campoId;
    }

    const [data, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where,
        orderBy: { fechaAnalisis: 'desc' },
        skip,
        take,
        include: {
          fenologiaEtapas: true,
          campo: { select: { id: true, codigoCampo: true, nombre: true } },
        },
      }),
      this.prisma.analysis.count({ where }),
    ]);

    return buildPaginated(data, total, page, limit);
  }

  async findById(id: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: {
        fenologiaEtapas: true,
        campo: { select: { id: true, codigoCampo: true, nombre: true } },
      },
    });
    if (!analysis)
      throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    return analysis;
  }

  async findScopeInfo(
    id: string,
  ): Promise<{ productorId: string; campoId: string }> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      select: { productorId: true, campoId: true },
    });
    if (!analysis)
      throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    return analysis;
  }

  async findScopeAndStorageKey(
    id: string,
  ): Promise<{
    productorId: string;
    campoId: string;
    storageKey: string | null;
  }> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      select: { productorId: true, campoId: true, storageKey: true },
    });
    if (!analysis)
      throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    return analysis;
  }

  async getImageUrl(
    storageKey: string | null,
    analysisId: string,
  ): Promise<{ url: string; width: number; height: number }> {
    if (!storageKey) {
      throw new NotFoundException(
        `El análisis ${analysisId} no tiene imagen asociada`,
      );
    }
    return this.cache.getOrSet(
      `analysis-display-image:${storageKey}`,
      800,
      async () => {
        const { key, originalWidth, originalHeight } =
          await this.storage.getOrCreateDisplayVariant(storageKey, 2048);
        const url = await this.storage.getPresignedUrl(key, 900);
        return { url, width: originalWidth, height: originalHeight };
      },
    );
  }

  async validate(id: string, corregidoPorId: string, dto: ValidateAnalysisDto) {
    const existing = await this.findById(id);

    const diagnosticoOriginal = existing.validacionFueCorregido
      ? existing.validacionDiagnosticoOriginal
      : JSON.stringify(existing.fenologiaEtapas);

    const updated = await this.prisma.analysis.update({
      where: { id },
      data: {
        validacionEstado: dto.action,
        validacionCorregidoPorId: corregidoPorId,
        ...(dto.observaciones !== undefined
          ? { validacionObservaciones: dto.observaciones }
          : {}),
        ...(dto.action === 'rechazado' && dto.cronograma_corregido?.length
          ? {
              validacionFueCorregido: true,
              validacionDiagnosticoOriginal: diagnosticoOriginal,
              validacionCronogramaCorregido:
                dto.cronograma_corregido as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
      include: {
        fenologiaEtapas: true,
        campo: { select: { id: true, codigoCampo: true, nombre: true } },
      },
    });

    this.logger.info('Análisis actualizado', {
      analysisId: id,
      action: dto.action,
      userId: corregidoPorId,
    });
    return updated;
  }

  async listDetections(analysisId: string) {
    const detections = await this.prisma.detection.findMany({
      where: { analysisId },
      orderBy: { createdAt: 'asc' },
      include: { feedback: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return detections.map((detection) => resolveDetectionState(detection));
  }

  async addDetection(
    analysisId: string,
    userId: string,
    dto: CreateDetectionDto,
  ) {
    await this.findById(analysisId);
    this.assertBboxValido(dto.bbox);

    const detection = await this.prisma.detection.create({
      data: {
        analysisId,
        origen: 'HUMANO',
        etapaDetectada: dto.etapa,
        saludDetectada: dto.sano ? 'SANO' : 'ENFERMO',
        bboxX1: dto.bbox[0],
        bboxY1: dto.bbox[1],
        bboxX2: dto.bbox[2],
        bboxY2: dto.bbox[3],
        creadoPorId: userId,
      },
    });

    const recienCreada = { ...detection, feedback: [] };
    return resolveDetectionState(recienCreada);
  }

  async addFeedback(
    analysisId: string,
    detectionId: string,
    userId: string,
    dto: DetectionFeedbackDto,
  ) {
    const detection = await this.prisma.detection.findFirst({
      where: { id: detectionId, analysisId },
    });
    if (!detection) {
      throw new NotFoundException(
        `Detección "${detectionId}" no encontrada en el análisis "${analysisId}"`,
      );
    }

    if (
      dto.accion === 'EDITAR' &&
      dto.etapaCorregida == null &&
      dto.saludCorregida == null
    ) {
      throw new BadRequestException(
        'accion=EDITAR requiere etapaCorregida y/o saludCorregida',
      );
    }
    if (dto.bbox) {
      this.assertBboxValido(dto.bbox);
    }

    const feedback = await this.prisma.modelFeedback.create({
      data: {
        analysisId,
        detectionId,
        accion: dto.accion,
        etapaCorregida: dto.etapaCorregida ?? null,
        saludCorregida:
          dto.saludCorregida == null
            ? null
            : dto.saludCorregida
              ? 'SANO'
              : 'ENFERMO',
        bboxX1: dto.bbox?.[0] ?? null,
        bboxY1: dto.bbox?.[1] ?? null,
        bboxX2: dto.bbox?.[2] ?? null,
        bboxY2: dto.bbox?.[3] ?? null,
        observaciones: dto.observaciones ?? null,
        creadoPorId: userId,
      },
    });

    return feedback;
  }

  async markReviewed(analysisId: string, userId: string) {
    await this.findById(analysisId);
    return this.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        deteccionesRevisadas: true,
        deteccionesRevisadasPorId: userId,
        deteccionesRevisadasAt: new Date(),
      },
    });
  }

  private assertBboxValido(bbox: [number, number, number, number]) {
    const [x1, y1, x2, y2] = bbox;
    if (x1 >= x2 || y1 >= y2) {
      throw new BadRequestException(
        'bbox inválido: se requiere x1 < x2 y y1 < y2',
      );
    }
  }
}
