import 'package:equatable/equatable.dart';

/// A single entry in cronograma_fenologico.
class FenologicalDetection extends Equatable {
  const FenologicalDetection({
    required this.label,
    required this.stage,
    required this.count,
    required this.daysToHarvest,
    required this.daysToNextStage,
    required this.nextStage,
    this.estimatedWeightGrams = 0.0,
    this.confidence = 0.0,
  });

  /// Raw stage label from the model, e.g. 'maduro', 'verde'
  final String label;

  /// Same as label — kept for display convenience
  final String stage;

  final int count;
  final int daysToHarvest;
  final int daysToNextStage;
  final String nextStage;
  final double estimatedWeightGrams;
  final double confidence;

  @override
  List<Object?> get props =>
      [label, count, daysToHarvest, daysToNextStage, nextStage];
}
