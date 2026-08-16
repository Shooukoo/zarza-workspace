import 'package:equatable/equatable.dart';
import 'fenological_detection.dart';

enum AnalysisStatus { uploaded, processing, completed, failed }
enum AnalysisValidationStatus { pendiente, validado, rechazado }

/// Full fruit-analysis result (maps the MongoDB 'analyses' collection).
class FruitAnalysis extends Equatable {
  const FruitAnalysis({
    required this.id,
    required this.imageId,
    required this.storageKey,
    required this.status,
    required this.detections,
    required this.totalDetected,
    required this.healthyCount,
    required this.sickCount,
    required this.lossPercent,
    required this.healthyWeightGrams,
    this.variety,
    this.analysisDate,
    this.createdAt,
    this.validationStatus = AnalysisValidationStatus.pendiente,
    this.observaciones,
  });

  final String id;
  final String imageId;
  final String storageKey;
  final AnalysisStatus status;
  final AnalysisValidationStatus validationStatus;
  final List<FenologicalDetection> detections; // cronograma_fenologico
  final int totalDetected;       // metricas_salud.total_elementos_detectados
  final int healthyCount;        // metricas_salud.elementos_sanos
  final int sickCount;           // metricas_salud.elementos_enfermos
  final double lossPercent;      // metricas_salud.porcentaje_merma_general
  final double healthyWeightGrams; // proyeccion_financiera.peso_sano_gramos
  final String? variety;         // variedad
  final String? analysisDate;    // fecha_analisis
  final DateTime? createdAt;
  final String? observaciones;   // validacionObservaciones

  /// Health score 0–100 derived from lossPercent
  double get healthScore => (100 - lossPercent).clamp(0, 100);

  /// Total weight = sum of per-stage estimated weights (if enriched); else 0
  double get totalWeightGrams => healthyWeightGrams;

  FruitAnalysis copyWith({
    String? id,
    String? imageId,
    String? storageKey,
    AnalysisStatus? status,
    AnalysisValidationStatus? validationStatus,
    List<FenologicalDetection>? detections,
    int? totalDetected,
    int? healthyCount,
    int? sickCount,
    double? lossPercent,
    double? healthyWeightGrams,
    String? variety,
    String? analysisDate,
    DateTime? createdAt,
    String? observaciones,
  }) {
    return FruitAnalysis(
      id: id ?? this.id,
      imageId: imageId ?? this.imageId,
      storageKey: storageKey ?? this.storageKey,
      status: status ?? this.status,
      validationStatus: validationStatus ?? this.validationStatus,
      detections: detections ?? this.detections,
      totalDetected: totalDetected ?? this.totalDetected,
      healthyCount: healthyCount ?? this.healthyCount,
      sickCount: sickCount ?? this.sickCount,
      lossPercent: lossPercent ?? this.lossPercent,
      healthyWeightGrams: healthyWeightGrams ?? this.healthyWeightGrams,
      variety: variety ?? this.variety,
      analysisDate: analysisDate ?? this.analysisDate,
      createdAt: createdAt ?? this.createdAt,
      observaciones: observaciones ?? this.observaciones,
    );
  }

  @override
  List<Object?> get props => [
        id,
        imageId,
        status,
        validationStatus,
      ];
}

/// Lightweight receipt returned immediately after POST /api/ingestion/upload
class UploadResult extends Equatable {
  const UploadResult({
    required this.imageId,
    required this.storageKey,
    required this.status,
  });

  final String imageId;
  final String storageKey;
  final String status;

  @override
  List<Object?> get props => [imageId, storageKey, status];
}
