import '../../domain/entities/fenological_detection.dart';

/// Maps one entry from either the [cronograma_fenologico] array (GET
/// /fruits, nested/snake_case) or the [fenologiaEtapas] array (fruit-backend
/// Prisma `FenologiaEtapa` rows, flat/camelCase).
///
/// GET /fruits shape:
/// ```json
/// { "etapa": "maduro", "cantidad": 2,
///   "prediccion": { "cambio_a": "...", "en_dias": 0, "dias_para_cosecha": 0 } }
/// ```
///
/// fruit-backend `FenologiaEtapa` shape:
/// ```json
/// { "etapa": "maduro", "cantidad": 2,
///   "cambiaA": "...", "enDias": 0, "diasParaCosecha": 0 }
/// ```
class DetectionModel {
  const DetectionModel({
    required this.etapa,
    required this.cantidad,
    required this.diasParaCosecha,
    required this.enDias,
    required this.cambioA,
  });

  final String etapa;
  final int cantidad;
  final int diasParaCosecha;
  final int enDias;
  final String cambioA;

  factory DetectionModel.fromJson(Map<String, dynamic> json) {
    final prediccion =
        json['prediccion'] as Map<String, dynamic>? ?? const {};
    return DetectionModel(
      etapa: json['etapa'] as String? ?? 'desconocido',
      cantidad: (json['cantidad'] as num?)?.toInt() ?? 0,
      diasParaCosecha: ((prediccion['dias_para_cosecha'] ??
                  json['diasParaCosecha'] ??
                  json['dias_para_cosecha']) as num?)
              ?.toInt() ??
          0,
      enDias: ((prediccion['en_dias'] ?? json['enDias'] ?? json['en_dias'])
                  as num?)
              ?.toInt() ??
          0,
      cambioA: (prediccion['cambio_a'] ?? json['cambiaA'] ?? json['cambia_a'])
              as String? ??
          '',
    );
  }

  FenologicalDetection toEntity() => FenologicalDetection(
        label: etapa,
        stage: etapa,
        count: cantidad,
        daysToHarvest: diasParaCosecha,
        daysToNextStage: enDias,
        nextStage: cambioA,
      );
}
