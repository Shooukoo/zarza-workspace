import '../../domain/entities/fruit_analysis.dart';
import 'detection_model.dart';

/// Maps the raw JSON from GET /api/fruits and GET /api/fruits/:id.
///
/// Real MongoDB document shape:
/// ```json
/// {
///   "_id":              "<ObjectId>",
///   "image_id":         "zarzamora_nueva_71.jpg",
///   "storage_key":      "raw/...",
///   "variedad":         null,
///   "fecha_analisis":   "2026-03-06T06:11:31...",
///   "metricas_salud":   {
///     "total_elementos_detectados": 5,
///     "elementos_sanos":            3,
///     "elementos_enfermos":         2,
///     "porcentaje_merma_general":   40.0
///   },
///   "proyeccion_financiera": { "peso_sano_gramos": 12.5 },
///   "cronograma_fenologico": [ { "etapa": "...", "cantidad": 1,
///     "prediccion": { "cambio_a": "...", "en_dias": 5, "dias_para_cosecha": 14 } } ],
///   "createdAt": "2026-03-06T06:11:31.079+00:00"
/// }
/// ```
class FruitAnalysisModel {
  const FruitAnalysisModel({
    required this.id,
    required this.imageId,
    required this.storageKey,
    required this.variedad,
    required this.fechaAnalisis,
    required this.totalDetectados,
    required this.elementosSanos,
    required this.elementosEnfermos,
    required this.porcentajeMerma,
    required this.pesoSanoGramos,
    required this.cronograma,
    this.createdAt,
  });

  final String id;
  final String imageId;
  final String storageKey;
  final String? variedad;
  final String? fechaAnalisis;
  final int totalDetectados;
  final int elementosSanos;
  final int elementosEnfermos;
  final double porcentajeMerma;
  final double pesoSanoGramos;
  final List<DetectionModel> cronograma;
  final DateTime? createdAt;

  factory FruitAnalysisModel.fromJson(Map<String, dynamic> json) {
    final metricas =
        json['metricas_salud'] as Map<String, dynamic>? ?? const {};
    final proyeccion =
        json['proyeccion_financiera'] as Map<String, dynamic>? ?? const {};

    final rawCronograma =
        json['cronograma_fenologico'] as List<dynamic>? ?? [];
    final cronograma = rawCronograma
        .map((e) => DetectionModel.fromJson(e as Map<String, dynamic>))
        .toList();

    return FruitAnalysisModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      imageId: json['image_id'] as String? ?? '',
      storageKey: json['storage_key'] as String? ?? '',
      variedad: json['variedad'] as String?,
      fechaAnalisis: json['fecha_analisis'] as String?,
      totalDetectados:
          (metricas['total_elementos_detectados'] as num?)?.toInt() ?? 0,
      elementosSanos:
          (metricas['elementos_sanos'] as num?)?.toInt() ?? 0,
      elementosEnfermos:
          (metricas['elementos_enfermos'] as num?)?.toInt() ?? 0,
      porcentajeMerma:
          (metricas['porcentaje_merma_general'] as num?)?.toDouble() ?? 0.0,
      pesoSanoGramos:
          (proyeccion['peso_sano_gramos'] as num?)?.toDouble() ?? 0.0,
      cronograma: cronograma,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  FruitAnalysis toEntity() => FruitAnalysis(
        id: id,
        imageId: imageId,
        storageKey: storageKey,
        status: AnalysisStatus.completed,
        detections: cronograma.map((d) => d.toEntity()).toList(),
        totalDetected: totalDetectados,
        healthyCount: elementosSanos,
        sickCount: elementosEnfermos,
        lossPercent: porcentajeMerma,
        healthyWeightGrams: pesoSanoGramos,
        variety: variedad,
        analysisDate: fechaAnalisis,
        createdAt: createdAt,
      );
}
