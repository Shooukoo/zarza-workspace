import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { ANALYSIS_REPOSITORY } from '../ports';
import type { IAnalysisRepository, FindAllFilter, PaginatedResult } from '../ports';
import type { AnalysisDomain, EtapaFenologica } from '../domain/analysis.entity';

@Injectable()
export class PrismaAnalysisRepository implements IAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(analysis: AnalysisDomain): Promise<string> {
    if (!analysis.campo_id) {
      throw new Error(`campo_id is required but was null — ensure campoId is sent in the upload request`);
    }
    if (!analysis.productor_id) {
      throw new Error(`productor_id is required but was null — ensure the requester user exists in the database`);
    }

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.analysis.create({
        data: {
          imageId:                  analysis.image_id,
          storageKey:               analysis.storage_key,
          requesterUserId:          analysis.requester.userId,
          requesterEmail:           analysis.requester.email,
          variedad:                 analysis.variedad ?? null,
          fechaAnalisis:            analysis.fecha_analisis,
          totalElementosDetectados: analysis.metricas_salud.total_elementos_detectados,
          elementosSanos:           analysis.metricas_salud.elementos_sanos,
          elementosEnfermos:        analysis.metricas_salud.elementos_enfermos,
          porcentajeMermaGeneral:   analysis.metricas_salud.porcentaje_merma_general,
          pesoSanoGramos:           analysis.proyeccion_financiera.peso_sano_gramos,
          campoId:                  analysis.campo_id as string,
          productorId:              analysis.productor_id as string,
          ubicacionLat:             analysis.ubicacion_gps?.coordinates[1] ?? null,
          ubicacionLng:             analysis.ubicacion_gps?.coordinates[0] ?? null,
          offlineSyncId:            analysis.offline_sync_id ?? null,
        },
      });

      if (analysis.cronograma_fenologico.length > 0) {
        await tx.fenologiaEtapa.createMany({
          data: analysis.cronograma_fenologico.map((e: EtapaFenologica) => ({
            analysisId:     created.id,
            etapa:          e.etapa,
            cantidad:       e.cantidad,
            cambiaA:        e.prediccion.cambio_a,
            enDias:         e.prediccion.en_dias,
            diasParaCosecha: e.prediccion.dias_para_cosecha,
          })),
        });
      }

      return created;
    });

    return record.id;
  }

  async findAll(
    page: number,
    limit: number,
    filter: FindAllFilter,
  ): Promise<PaginatedResult<AnalysisDomain>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (filter.imageId)    where.imageId         = filter.imageId;
    if (filter.userId)     where.requesterUserId  = filter.userId;
    if (filter.productorId) where.productorId     = filter.productorId;
    if (filter.campoIds?.length) where.campoId    = { in: filter.campoIds };

    if (filter.startDate || filter.endDate) {
      where.fechaAnalisis = {
        ...(filter.startDate ? { gte: filter.startDate } : {}),
        ...(filter.endDate   ? { lte: filter.endDate }   : {}),
      };
    }

    const [docs, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { fenologiaEtapas: true },
      }),
      this.prisma.analysis.count({ where }),
    ]);

    return { data: docs.map((d) => this.toDomain(d)), total, page, limit };
  }

  async findById(id: string): Promise<AnalysisDomain | null> {
    const doc = await this.prisma.analysis.findFirst({
      where: { OR: [{ id }, { imageId: id }] },
      include: { fenologiaEtapas: true },
    });
    if (!doc) return null;
    return this.toDomain(doc);
  }

  private toDomain(doc: any): AnalysisDomain {
    return {
      id:            doc.id,
      image_id:      doc.imageId,
      storage_key:   doc.storageKey,
      requester:     { userId: doc.requesterUserId, email: doc.requesterEmail },
      variedad:      doc.variedad ?? null,
      fecha_analisis: doc.fechaAnalisis,
      metricas_salud: {
        total_elementos_detectados: doc.totalElementosDetectados,
        elementos_sanos:            doc.elementosSanos,
        elementos_enfermos:         doc.elementosEnfermos,
        porcentaje_merma_general:   doc.porcentajeMermaGeneral,
      },
      proyeccion_financiera: { peso_sano_gramos: doc.pesoSanoGramos },
      cronograma_fenologico: (doc.fenologiaEtapas ?? []).map((e: any) => ({
        etapa:    e.etapa,
        cantidad: e.cantidad,
        prediccion: {
          cambio_a:         e.cambiaA,
          en_dias:          e.enDias,
          dias_para_cosecha: e.diasParaCosecha,
        },
      })),
      campo_id:       doc.campoId ?? null,
      productor_id:   doc.productorId ?? null,
      ubicacion_gps:
        doc.ubicacionLat != null && doc.ubicacionLng != null
          ? { type: 'Point', coordinates: [doc.ubicacionLng, doc.ubicacionLat] }
          : null,
      offline_sync_id: doc.offlineSyncId ?? null,
      validacion_experto: doc.validacionCorregidoPorId
        ? {
            fue_corregido:        doc.validacionFueCorregido,
            corregido_por:        doc.validacionCorregidoPorId,
            diagnostico_original: doc.validacionDiagnosticoOriginal ?? null,
          }
        : null,
    };
  }
}
