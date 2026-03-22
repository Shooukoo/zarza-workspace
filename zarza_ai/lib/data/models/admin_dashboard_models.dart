import 'package:equatable/equatable.dart';

import '../../domain/entities/admin_dashboard_entity.dart';

// -----------------------------------------------------------------------------
// DTOs
// -----------------------------------------------------------------------------

class YieldForecastDto extends Equatable {
  const YieldForecastDto({
    required this.daysToHarvest,
    required this.estimatedWeightGrams,
  });

  final int daysToHarvest;
  final double estimatedWeightGrams;

  factory YieldForecastDto.fromJson(Map<String, dynamic> json) {
    return YieldForecastDto(
      daysToHarvest: (json['daysToHarvest'] as num).toInt(),
      estimatedWeightGrams: (json['estimatedWeightGrams'] as num).toDouble(),
    );
  }

  YieldForecastEntity toEntity() {
    return YieldForecastEntity(
      daysToHarvest: daysToHarvest,
      estimatedWeightGrams: estimatedWeightGrams,
    );
  }

  @override
  List<Object?> get props => [daysToHarvest, estimatedWeightGrams];
}

class HealthMetricsDto extends Equatable {
  const HealthMetricsDto({
    required this.avgLossPercent,
    required this.totalSickCount,
    required this.totalHealthyCount,
    required this.totalDetected,
  });

  final double avgLossPercent;
  final int totalSickCount;
  final int totalHealthyCount;
  final int totalDetected;

  factory HealthMetricsDto.fromJson(Map<String, dynamic> json) {
    return HealthMetricsDto(
      avgLossPercent: (json['avgLossPercent'] as num).toDouble(),
      totalSickCount: (json['totalSickCount'] as num).toInt(),
      totalHealthyCount: (json['totalHealthyCount'] as num).toInt(),
      totalDetected: (json['totalDetected'] as num).toInt(),
    );
  }

  HealthMetricsEntity toEntity() {
    return HealthMetricsEntity(
      avgLossPercent: avgLossPercent,
      totalSickCount: totalSickCount,
      totalHealthyCount: totalHealthyCount,
      totalDetected: totalDetected,
    );
  }

  @override
  List<Object?> get props => [
        avgLossPercent,
        totalSickCount,
        totalHealthyCount,
        totalDetected,
      ];
}

class PhenologyDistributionDto extends Equatable {
  const PhenologyDistributionDto({
    required this.stage,
    required this.count,
  });

  final String stage;
  final int count;

  factory PhenologyDistributionDto.fromJson(Map<String, dynamic> json) {
    return PhenologyDistributionDto(
      stage: json['stage'] as String,
      count: (json['count'] as num).toInt(),
    );
  }

  PhenologyDistributionEntity toEntity() {
    return PhenologyDistributionEntity(stage: stage, count: count);
  }

  @override
  List<Object?> get props => [stage, count];
}
