import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/entities/fruit_analysis.dart';

/// Colored badge chip showing a phenological stage.
class StageBadge extends StatelessWidget {
  const StageBadge({super.key, required this.label, this.count});

  final String label;
  final int? count;

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.stageColor(label);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.5), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            count != null ? '$label ×$count' : label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Single-row status badge (UPLOADED / PROCESSING / COMPLETED / FAILED).
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});
  final AnalysisStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      AnalysisStatus.uploaded => ('SUBIDO', Colors.blue),
      AnalysisStatus.processing => ('ANALIZANDO', Colors.orange),
      AnalysisStatus.completed => ('COMPLETADO', const Color(0xFF4CAF50)),
      AnalysisStatus.failed => ('FALLIDO', Colors.redAccent),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
