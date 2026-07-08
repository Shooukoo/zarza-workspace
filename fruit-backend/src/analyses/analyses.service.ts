import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  PrismaService,
  Prisma,
  clampPagination,
  buildPaginated,
} from '@rubus/database';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { STORAGE_PORT, type IStoragePort } from '../storage/ports';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { Role } from '../auth/domain/enums/role.enum';

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT)
    private readonly storage: IStoragePort,
  ) {}

  async findAll(
    pageParam: number,
    limitParam: number,
    estado: 'pendiente' | 'validado' | 'rechazado' | 'all',
    scope: UserScope,
    campoId?: string,
  ) {
    const { page, limit, skip, take } = clampPagination(pageParam, limitParam);
    const where: Record<string, unknown> = {};

    if (estado !== 'all') {
      where.validacionEstado = estado;
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

  async getImageUrl(id: string): Promise<string> {
    const analysis = await this.findById(id);
    if (!analysis.storageKey) {
      throw new NotFoundException(`El análisis ${id} no tiene imagen asociada`);
    }
    return this.storage.getPresignedUrl(analysis.storageKey, 900);
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
        ...(dto.action === 'rechazado' && dto.cronograma_corregido?.length
          ? {
              validacionFueCorregido: true,
              validacionDiagnosticoOriginal: diagnosticoOriginal,
              validacionCronogramaCorregido:
                dto.cronograma_corregido as unknown as Prisma.InputJsonValue,
              validacionObservaciones: dto.observaciones ?? '',
            }
          : {}),
      },
      include: {
        fenologiaEtapas: true,
        campo: { select: { id: true, codigoCampo: true, nombre: true } },
      },
    });

    this.logger.log(
      `Análisis ${id} ${dto.action} por usuario ${corregidoPorId}`,
    );
    return updated;
  }
}
