import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/entities/fruit_analysis.dart';
import '../../domain/entities/fenological_detection.dart';
import '../widgets/help_tooltip.dart';
import '../widgets/ring_progress.dart';
import '../widgets/stage_badge.dart' show StageBadge, StatusBadge;
import 'results_bloc.dart';

class ResultsScreen extends StatelessWidget {
  const ResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Resultado del Análisis'),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_rounded),
            onPressed: () => context.go('/home'),
          ),
        ],
      ),
      body: BlocBuilder<ResultsBloc, ResultsState>(
        builder: (context, state) {
          if (state is ResultsLoading || state is ResultsInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is ResultsError) {
            return _ErrorBody(message: state.message);
          }
          if (state is ResultsLoaded) {
            return _ResultsBody(analysis: state.analysis);
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

// ── Error ─────────────────────────────────────────────────────────────────────

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 64, color: AppTheme.danger),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.go('/home'),
              icon: const Icon(Icons.home_rounded),
              label: const Text('Volver al inicio'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Results body ──────────────────────────────────────────────────────────────

class _ResultsBody extends StatelessWidget {
  const _ResultsBody({required this.analysis});
  final FruitAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        const SizedBox(height: 12),
        _HealthCard(analysis: analysis),
        const SizedBox(height: 4),
        _SummaryCard(analysis: analysis),
        const SizedBox(height: 4),
        if (analysis.detections.isNotEmpty) ...[
          _DetectionsCard(detections: analysis.detections),
          const SizedBox(height: 4),
          _HarvestTimeline(detections: analysis.detections),
          const SizedBox(height: 4),
        ],
        _WeightCard(analysis: analysis),
      ],
    );
  }
}

// ── Health card (hero) ────────────────────────────────────────────────────────

class _HealthCard extends StatelessWidget {
  const _HealthCard({required this.analysis});
  final FruitAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    final score = analysis.healthScore;
    final color = score >= 70
        ? AppTheme.emerald
        : score >= 40
            ? AppTheme.warn
            : AppTheme.danger;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Índice de Salud',
                        style: Theme.of(context)
                            .textTheme
                            .labelSmall!
                            .copyWith(
                              color: AppTheme.dataGray,
                              fontSize: 12,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            score.toStringAsFixed(0),
                            style: const TextStyle(
                              fontSize: 42,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.frost,
                              fontFamily: 'Lexend',
                              height: 1.1,
                            ),
                          ),
                          const Text(
                            '%',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w300,
                              color: AppTheme.frostDim,
                              fontFamily: 'Lexend',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                RingProgress(
                  value: score,
                  color: color,
                  size: 72,
                  strokeWidth: 6,
                  child: Icon(
                    Icons.favorite_rounded,
                    size: 20,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: score / 100,
                minHeight: 6,
                backgroundColor: AppTheme.obsidian3,
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            const SizedBox(height: 10),
            // 3-col mini stats
            Row(
              children: [
                _ResultStat(
                  label: 'Merma',
                  value: '${analysis.lossPercent.toStringAsFixed(1)}%',
                  color: AppTheme.warn,
                ),
                _ResultStat(
                  label: 'Sanos',
                  value: '${analysis.healthyCount}',
                  color: AppTheme.emerald,
                ),
                _ResultStat(
                  label: 'Dañados',
                  value: '${analysis.sickCount}',
                  color: AppTheme.danger,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ResultStat extends StatelessWidget {
  const _ResultStat({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppTheme.obsidian3,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.grayLine),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                color: AppTheme.dataGray,
                fontFamily: 'Lexend',
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: color,
                fontFamily: 'Lexend',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Summary card ──────────────────────────────────────────────────────────────

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.analysis});
  final FruitAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    final date = analysis.createdAt != null
        ? '${analysis.createdAt!.day}/${analysis.createdAt!.month}/${analysis.createdAt!.year}'
        : analysis.analysisDate ?? '—';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.eco_rounded,
                    color: AppTheme.emerald, size: 18),
                const SizedBox(width: 8),
                Text('Resumen',
                    style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                Row(
                  children: [
                    StatusBadge(status: analysis.status),
                    const SizedBox(width: 6),
                    const HelpTooltip(
                      content: 'SUBIDO = carga completada. '
                          'ANALIZANDO = procesando. '
                          'COMPLETADO = análisis finalizado. '
                          'FALLIDO = error, reintentar.',
                      maxWidth: 260,
                    ),
                  ],
                ),
                const SizedBox(width: 8),
                if (analysis.variety != null)
                  Chip(label: Text(analysis.variety!)),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _StatTile(
                  icon: Icons.grain_rounded,
                  value: '${analysis.totalDetected}',
                  label: 'Detectados',
                ),
                const SizedBox(width: 8),
                _StatTile(
                  icon: Icons.check_circle_outline_rounded,
                  value: '${analysis.healthyCount}',
                  label: 'Sanos',
                  color: AppTheme.emerald,
                ),
                const SizedBox(width: 8),
                _StatTile(
                  icon: Icons.cancel_outlined,
                  value: '${analysis.sickCount}',
                  label: 'Dañados',
                  color: AppTheme.danger,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(date, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.icon,
    required this.value,
    required this.label,
    this.color = AppTheme.rubusLight,
  });
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppTheme.obsidian3,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.grayLine),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: color,
                fontFamily: 'Lexend',
              ),
            ),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: AppTheme.dataGray,
                fontFamily: 'Lexend',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Detections card ───────────────────────────────────────────────────────────

class _DetectionsCard extends StatelessWidget {
  const _DetectionsCard({required this.detections});
  final List<FenologicalDetection> detections;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.bar_chart_rounded,
                    color: AppTheme.rubusLight, size: 18),
                const SizedBox(width: 8),
                Text('Etapas fenológicas',
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(width: 6),
                const HelpTooltip(
                  content: 'Etapas de desarrollo de la fruta. '
                      'Stages 1-7 según cronología de maduración. '
                      'Cada etapa indica progreso en madurez.',
                  maxWidth: 260,
                ),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: detections
                  .map((d) => StageBadge(label: d.label, count: d.count))
                  .toList(),
            ),
            const SizedBox(height: 14),
            ...detections.map((d) => _DetectionRow(detection: d)),
          ],
        ),
      ),
    );
  }
}

class _DetectionRow extends StatelessWidget {
  const _DetectionRow({required this.detection});
  final FenologicalDetection detection;

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.stageColor(detection.label);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 36,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  detection.stage,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: AppTheme.frost,
                    fontFamily: 'Lexend',
                  ),
                ),
                if (detection.nextStage.isNotEmpty)
                  Text(
                    'Siguiente: ${detection.nextStage} en ${detection.daysToNextStage} días',
                    style: const TextStyle(
                      color: AppTheme.dataGray,
                      fontSize: 12,
                      fontFamily: 'Lexend',
                    ),
                  ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '×${detection.count}',
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                  fontFamily: 'Lexend',
                ),
              ),
              Text(
                '${detection.daysToHarvest}d cosecha',
                style: const TextStyle(
                  color: AppTheme.dataGray,
                  fontSize: 11,
                  fontFamily: 'Lexend',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Harvest timeline ──────────────────────────────────────────────────────────

class _HarvestTimeline extends StatelessWidget {
  const _HarvestTimeline({required this.detections});
  final List<FenologicalDetection> detections;

  @override
  Widget build(BuildContext context) {
    final sorted = [...detections]
      ..sort((a, b) => a.daysToHarvest.compareTo(b.daysToHarvest));
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.calendar_month_rounded,
                    color: AppTheme.emerald, size: 18),
                const SizedBox(width: 8),
                Text('Cronograma de cosecha',
                    style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 16),
            ...sorted.map((d) => _TimelineItem(detection: d)),
          ],
        ),
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  const _TimelineItem({required this.detection});
  final FenologicalDetection detection;

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.stageColor(detection.label);
    final isReady = detection.daysToHarvest == 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(color: color.withValues(alpha: 0.5)),
            ),
            child: Center(
              child: Text(
                isReady ? '✓' : '${detection.daysToHarvest}',
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w800,
                  fontSize: isReady ? 16 : 13,
                  fontFamily: 'Lexend',
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  detection.stage,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppTheme.frost,
                    fontFamily: 'Lexend',
                  ),
                ),
                Text(
                  isReady
                      ? 'Listo para cosechar'
                      : '${detection.daysToHarvest} días para cosecha',
                  style: const TextStyle(
                    color: AppTheme.dataGray,
                    fontSize: 12,
                    fontFamily: 'Lexend',
                  ),
                ),
              ],
            ),
          ),
          StageBadge(label: detection.label),
        ],
      ),
    );
  }
}

// ── Weight card ───────────────────────────────────────────────────────────────

class _WeightCard extends StatelessWidget {
  const _WeightCard({required this.analysis});
  final FruitAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppTheme.emerald.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: AppTheme.emerald.withValues(alpha: 0.3)),
              ),
              child: const Icon(Icons.monitor_weight_rounded,
                  color: AppTheme.emerald, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Peso sano estimado',
                      style: Theme.of(context).textTheme.titleMedium),
                  Text(
                    'Proyección de producción aprovechable',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium!
                        .copyWith(color: AppTheme.dataGray),
                  ),
                ],
              ),
            ),
            Text(
              '${analysis.healthyWeightGrams.toStringAsFixed(1)} g',
              style: const TextStyle(
                color: AppTheme.emerald,
                fontWeight: FontWeight.w800,
                fontSize: 22,
                fontFamily: 'Lexend',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
