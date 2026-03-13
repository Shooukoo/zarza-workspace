import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../domain/entities/fruit_analysis.dart';
import '../../domain/entities/fenological_detection.dart';
import '../../core/theme/app_theme.dart';
import '../widgets/stage_badge.dart';
import 'results_bloc.dart';

class ResultsScreen extends StatelessWidget {
  const ResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Resultado del análisis'),
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
            const Icon(Icons.error_outline_rounded, size: 64, color: Colors.redAccent),
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

class _ResultsBody extends StatelessWidget {
  const _ResultsBody({required this.analysis});
  final FruitAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        const SizedBox(height: 12),
        _SummaryCard(analysis: analysis),
        const SizedBox(height: 12),
        _HealthCard(analysis: analysis),
        const SizedBox(height: 12),
        if (analysis.detections.isNotEmpty) ...[
          _DetectionsCard(detections: analysis.detections),
          const SizedBox(height: 12),
          _HarvestTimeline(detections: analysis.detections),
          const SizedBox(height: 12),
        ],
        _WeightCard(analysis: analysis),
      ],
    );
  }
}

// ── Summary card ──────────────────────────────────────────────────────────────

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.analysis});
  final FruitAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
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
                const Icon(Icons.eco_rounded, color: Color(0xFF4CAF50), size: 20),
                const SizedBox(width: 8),
                Text('Resumen', style: theme.textTheme.titleMedium),
                const Spacer(),
                if (analysis.variety != null)
                  Chip(label: Text(analysis.variety!)),
              ],
            ),
            const SizedBox(height: 16),
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
                  color: const Color(0xFF4CAF50),
                ),
                const SizedBox(width: 8),
                _StatTile(
                  icon: Icons.cancel_outlined,
                  value: '${analysis.sickCount}',
                  label: 'Dañados',
                  color: Colors.redAccent,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(date, style: theme.textTheme.labelSmall),
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
    this.color = const Color(0xFF4CAF50),
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
          color: const Color(0xFF0A0A0A),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 18, color: color)),
            Text(label,
                style: const TextStyle(fontSize: 11, color: Colors.white54)),
          ],
        ),
      ),
    );
  }
}

// ── Health / merma card ───────────────────────────────────────────────────────

class _HealthCard extends StatelessWidget {
  const _HealthCard({required this.analysis});
  final FruitAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    final score = analysis.healthScore;
    final color = score >= 70
        ? const Color(0xFF4CAF50)
        : score >= 40
            ? Colors.orange
            : Colors.redAccent;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.favorite_rounded, color: color, size: 20),
                const SizedBox(width: 8),
                Text('Salud del cultivo',
                    style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                Text(
                  '${score.toStringAsFixed(0)}%',
                  style: TextStyle(
                      color: color, fontWeight: FontWeight.w800, fontSize: 22),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: score / 100,
                minHeight: 8,
                backgroundColor: const Color(0xFF1E1E1E),
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Merma: ${analysis.lossPercent.toStringAsFixed(1)}% · '
              'Sanos: ${analysis.healthyCount} · '
              'Dañados: ${analysis.sickCount}',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium!
                  .copyWith(color: Colors.white54),
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
                    color: Color(0xFF4CAF50), size: 20),
                const SizedBox(width: 8),
                Text('Etapas fenológicas',
                    style: Theme.of(context).textTheme.titleMedium),
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
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 36,
            decoration: BoxDecoration(
                color: color, borderRadius: BorderRadius.circular(2)),
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
                      color: Colors.white),
                ),
                if (detection.nextStage.isNotEmpty)
                  Text(
                    'Siguiente: ${detection.nextStage} en ${detection.daysToNextStage} días',
                    style:
                        const TextStyle(color: Colors.white54, fontSize: 12),
                  ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('×${detection.count}',
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w700,
                      fontSize: 18)),
              Text('${detection.daysToHarvest}d cosecha',
                  style:
                      const TextStyle(color: Colors.white38, fontSize: 11)),
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
                    color: Color(0xFF69F0AE), size: 20),
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
              color: color.withOpacity(0.15),
              shape: BoxShape.circle,
              border: Border.all(color: color.withOpacity(0.5)),
            ),
            child: Center(
              child: Text(
                isReady ? '✓' : '${detection.daysToHarvest}',
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w800,
                    fontSize: isReady ? 16 : 13),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(detection.stage,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, color: Colors.white)),
                Text(
                  isReady
                      ? 'Listo para cosechar'
                      : '${detection.daysToHarvest} días para cosecha',
                  style:
                      const TextStyle(color: Colors.white54, fontSize: 12),
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
            const Icon(Icons.monitor_weight_rounded,
                color: Color(0xFF69F0AE), size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Peso sano estimado',
                      style: Theme.of(context).textTheme.titleMedium),
                  Text('Proyección de producción aprovechable',
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium!
                          .copyWith(color: Colors.white54)),
                ],
              ),
            ),
            Text(
              '${analysis.healthyWeightGrams.toStringAsFixed(1)} g',
              style: const TextStyle(
                color: Color(0xFF69F0AE),
                fontWeight: FontWeight.w800,
                fontSize: 22,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
