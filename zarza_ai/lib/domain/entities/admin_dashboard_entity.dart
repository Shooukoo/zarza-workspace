import 'package:equatable/equatable.dart';

class YieldForecastEntity extends Equatable {
  const YieldForecastEntity({
    required this.daysToHarvest,
    required this.estimatedWeightGrams,
  });

  final int daysToHarvest;
  final double estimatedWeightGrams;

  @override
  List<Object?> get props => [daysToHarvest, estimatedWeightGrams];
}

class HealthMetricsEntity extends Equatable {
  const HealthMetricsEntity({
    required this.avgLossPercent,
    required this.totalSickCount,
    required this.totalHealthyCount,
    required this.totalDetected,
  });

  final double avgLossPercent;
  final int totalSickCount;
  final int totalHealthyCount;
  final int totalDetected;

  @override
  List<Object?> get props => [
        avgLossPercent,
        totalSickCount,
        totalHealthyCount,
        totalDetected,
      ];
}

class PhenologyDistributionEntity extends Equatable {
  const PhenologyDistributionEntity({
    required this.stage,
    required this.count,
  });

  final String stage;
  final int count;

  @override
  List<Object?> get props => [stage, count];
}
