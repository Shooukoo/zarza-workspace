import { AnalysisResponseDto } from '../dto/analysis-response.dto';
import { AnalysisDomain } from '../domain/analysis.entity';

/**
 * Mapper que traduce el DTO de red (contrato de la API de fruit-inference)
 * a la entidad de dominio pura. FruitsService sólo pasa por este punto de
 * conversión y nunca navega directamente los campos de AnalysisResponseDto.
 */
export class InferenceMapper {
  static toDomain(
    dto: AnalysisResponseDto,
    storageKey: string,
  ): AnalysisDomain {
    return {
      image_id:   dto.image_id,
      storage_key: storageKey,
      variedad:   dto.variedad ?? null,
      fecha_analisis: dto.fecha_analisis,
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
    };
  }
}
