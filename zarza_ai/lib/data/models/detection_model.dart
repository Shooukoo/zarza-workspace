import '../../domain/entities/fenological_detection.dart';

/// Maps one entry from [cronograma_fenologico] array.
///
/// MongoDB schema:
/// ```json
/// { "etapa": "maduro", "cantidad": 2,
///   "prediccion": { "cambio_a": "...", "en_dias": 0, "dias_para_cosecha": 0 } }
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
      diasParaCosecha:
          (prediccion['dias_para_cosecha'] as num?)?.toInt() ?? 0,
      enDias: (prediccion['en_dias'] as num?)?.toInt() ?? 0,
      cambioA: prediccion['cambio_a'] as String? ?? '',
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
