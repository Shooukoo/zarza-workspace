import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../domain/entities/fruit_analysis.dart';
import '../history/history_bloc.dart';
import '../widgets/stage_badge.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key, this.showAppBar = true});
  final bool showAppBar;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: showAppBar ? AppBar(title: const Text('Historial de análisis')) : null,
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
            color: const Color(0xFF69F0AE),
            onRefresh: () async =>
                context.read<HistoryBloc>().add(const HistoryLoadEvent()),
            child: ListView.builder(
              padding: const EdgeInsets.only(top: 8, bottom: 32),
              itemCount: analyses.length + (hasMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == analyses.length) {
                  return _LoadMoreButton(
                    isLoading: state is HistoryLoadingMore,
                    onTap: () => context
                        .read<HistoryBloc>()
                        .add(const HistoryLoadMoreEvent()),
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
        ? const Color(0xFF4CAF50)
        : score >= 40
            ? Colors.orange
            : Colors.redAccent;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/results/${analysis.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2E7D32).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.eco_rounded,
                        size: 20, color: Color(0xFF4CAF50)),
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
                  StatusBadge(status: analysis.status),
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
                  Icon(Icons.favorite_rounded, size: 14, color: scoreColor),
                  const SizedBox(width: 4),
                  Text(
                    '${score.toStringAsFixed(0)}% salud',
                    style: TextStyle(
                        color: scoreColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 12),
                  ),
                  const SizedBox(width: 12),
                  const Icon(Icons.monitor_weight_rounded,
                      size: 14, color: Color(0xFF69F0AE)),
                  const SizedBox(width: 4),
                  Text(
                    '${analysis.healthyWeightGrams.toStringAsFixed(1)} g',
                    style: const TextStyle(
                        color: Color(0xFF69F0AE),
                        fontWeight: FontWeight.w600,
                        fontSize: 12),
                  ),
                  const Spacer(),
                  const Icon(Icons.chevron_right_rounded,
                      color: Colors.white38, size: 18),
                ],
              ),
            ],
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
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: const Color(0xFF2E7D32).withValues(alpha: 0.5)),
          minimumSize: const Size.fromHeight(46),
        ),
        child: isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Color(0xFF69F0AE)))
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
          const Icon(Icons.history_toggle_off_rounded,
              size: 64, color: Colors.white24),
          const SizedBox(height: 16),
          Text('No hay análisis registrados.',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium!
                  .copyWith(color: Colors.white38)),
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
            const Icon(Icons.cloud_off_rounded, size: 56, color: Colors.white24),
            const SizedBox(height: 16),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white54)),
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
