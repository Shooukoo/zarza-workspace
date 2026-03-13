import 'package:equatable/equatable.dart';
import 'fenological_detection.dart';

enum AnalysisStatus { uploaded, processing, completed, failed }

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
  });

  final String id;
  final String imageId;
  final String storageKey;
  final AnalysisStatus status;
  final List<FenologicalDetection> detections; // cronograma_fenologico
  final int totalDetected;       // metricas_salud.total_elementos_detectados
  final int healthyCount;        // metricas_salud.elementos_sanos
  final int sickCount;           // metricas_salud.elementos_enfermos
  final double lossPercent;      // metricas_salud.porcentaje_merma_general
  final double healthyWeightGrams; // proyeccion_financiera.peso_sano_gramos
  final String? variety;         // variedad
  final String? analysisDate;    // fecha_analisis
  final DateTime? createdAt;

  /// Health score 0–100 derived from lossPercent
  double get healthScore => (100 - lossPercent).clamp(0, 100);

  /// Total weight = sum of per-stage estimated weights (if enriched); else 0
  double get totalWeightGrams => healthyWeightGrams;

  @override
  List<Object?> get props => [id, imageId, status];
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
