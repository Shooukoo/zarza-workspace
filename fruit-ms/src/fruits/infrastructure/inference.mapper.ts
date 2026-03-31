import { AnalysisResponseDto } from '../dto/analysis-response.dto';
import { AnalysisDomain, GeoJsonPoint, UserSnapshot } from '../domain/analysis.entity';

/**
 * Mapper de infraestructura: traduce el DTO de red (contrato de la API de fruit-inference)
 * a la entidad de dominio pura. Solo FruitsService pasa por este punto de conversión.
 */
export class InferenceMapper {
  static toDomain(
    dto: AnalysisResponseDto,
    storageKey: string,
    requester: UserSnapshot,
    context?: {
      campoId?:       string | null;
      productorId?:   string | null;
      gpsLat?:        number | null;
      gpsLon?:        number | null;
      offlineSyncId?: string | null;
    },
  ): AnalysisDomain {
    // Build GeoJSON Point only when coordinates are present
    let ubicacion_gps: GeoJsonPoint | null = null;
    if (context?.gpsLon != null && context?.gpsLat != null) {
      ubicacion_gps = {
        type: 'Point',
        coordinates: [context.gpsLon, context.gpsLat], // GeoJSON: [longitude, latitude]
      };
    }

    return {
      image_id:    dto.image_id,
      storage_key: storageKey,
      requester,
      variedad:    dto.variedad ?? null,
      fecha_analisis: new Date(dto.fecha_analisis),
      metricas_salud: {
        total_elementos_detectados: dto.metricas_salud.total_elementos_detectados,
        elementos_sanos:            dto.metricas_salud.elementos_sanos,
        elementos_enfermos:         dto.metricas_salud.elementos_enfermos,
        porcentaje_merma_general:   dto.metricas_salud.porcentaje_merma_general,
      },
      proyeccion_financiera: {
        peso_sano_gramos: dto.proyeccion_financiera.peso_sano_gramos,
      },
      cronograma_fenologico: dto.cronograma_fenologico.map((etapa) => ({
        etapa:     etapa.etapa,
        cantidad:  etapa.cantidad,
        prediccion: {
          cambio_a:          etapa.prediccion.cambio_a,
          en_dias:           etapa.prediccion.en_dias,
          dias_para_cosecha: etapa.prediccion.dias_para_cosecha,
        },
      })),
      // V2 fields
      campo_id:      context?.campoId    ?? null,
      productor_id:  context?.productorId ?? null,
      ubicacion_gps,
      offline_sync_id: context?.offlineSyncId ?? null,
      validacion_experto: null,
    };
  }
}


