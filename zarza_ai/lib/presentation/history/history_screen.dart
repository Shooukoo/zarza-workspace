import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/entities/fruit_analysis.dart';
import '../history/history_bloc.dart';
import '../widgets/ring_progress.dart';
import '../widgets/stage_badge.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key, this.showAppBar = true});
  final bool showAppBar;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: showAppBar
          ? AppBar(title: const Text('Historial de Análisis'))
          : null,
      body: BlocBuilder<HistoryBloc, HistoryState>(
        builder: (context, state) {
          if (state is HistoryLoading || state is HistoryInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is HistoryError) {
            return _ErrorView(
              message: state.message,
              onRetry: () =>
                  context.read<HistoryBloc>().add(const HistoryLoadEvent()),
            );
          }
          final analyses = state is HistoryLoaded
              ? state.analyses
              : (state as HistoryLoadingMore).current;
          final hasMore = state is HistoryLoaded ? state.hasMore : false;

          if (analyses.isEmpty) return const _EmptyView();

          return RefreshIndicator(
            color: AppTheme.rubusLight,
            onRefresh: () async =>
                context.read<HistoryBloc>().add(const HistoryLoadEvent()),
            child: ListView.builder(
              padding: const EdgeInsets.only(top: 8, bottom: 32),
              itemCount: analyses.length + (hasMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == analyses.length) {
                  return _LoadMoreButton(
                    isLoading: state is HistoryLoadingMore,
                    onTap: () => context.read<HistoryBloc>().add(
                      const HistoryLoadMoreEvent(),
                    ),
                  );
                }
                return _HistoryCard(analysis: analyses[index]);
              },
            ),
          );
        },
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.analysis});
  final FruitAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final date = analysis.createdAt != null
        ? '${analysis.createdAt!.day}/${analysis.createdAt!.month}/${analysis.createdAt!.year}'
        : '—';
    final score = analysis.healthScore;
    final scoreColor = score >= 70
        ? AppTheme.emerald
        : score >= 40
        ? AppTheme.warn
        : AppTheme.danger;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Material(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () async {
            final updated =
                await context.push<FruitAnalysis?>('/results/${analysis.id}');
            if (updated != null && context.mounted) {
              context
                  .read<HistoryBloc>()
                  .add(HistoryAnalysisUpdatedEvent(updated));
            }
          },
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    RingProgress(
                      value: score,
                      color: scoreColor,
                      size: 44,
                      strokeWidth: 5,
                      child: Text(
                        score.toStringAsFixed(0),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.frost,
                          fontFamily: 'Lexend',
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${analysis.totalDetected} detectados · ${analysis.healthyCount} sanos',
                            style: theme.textTheme.titleMedium,
                          ),
                          Text(date, style: theme.textTheme.labelSmall),
                        ],
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        StatusBadge(status: analysis.status),
                        const SizedBox(height: 4),
                        ValidationStatusBadge(
                          status: analysis.validationStatus,
                        ),
                      ],
                    ),
                  ],
                ),
                if (analysis.detections.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: analysis.detections
                        .take(4)
                        .map((d) => StageBadge(label: d.label, count: d.count))
                        .toList(),
                  ),
                ],
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(
                      Icons.monitor_weight_rounded,
                      size: 14,
                      color: AppTheme.emerald,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${analysis.healthyWeightGrams.toStringAsFixed(1)} g',
                      style: const TextStyle(
                        color: AppTheme.emerald,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                        fontFamily: 'Lexend',
                      ),
                    ),
                    const Spacer(),
                    const Icon(
                      Icons.chevron_right_rounded,
                      color: AppTheme.dataGray,
                      size: 18,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LoadMoreButton extends StatelessWidget {
  const _LoadMoreButton({required this.isLoading, required this.onTap});
  final bool isLoading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: OutlinedButton(
        onPressed: isLoading ? null : onTap,
        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
        child: isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppTheme.rubusLight,
                ),
              )
            : const Text('Cargar más'),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.history_toggle_off_rounded,
            size: 64,
            color: AppTheme.grayLine,
          ),
          const SizedBox(height: 16),
          Text(
            'No hay análisis registrados.',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium!.copyWith(color: AppTheme.dataGray),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 56,
              color: AppTheme.grayLine,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.dataGray),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}
