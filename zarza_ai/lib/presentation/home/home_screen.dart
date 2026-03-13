import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:get_it/get_it.dart';

import '../../domain/entities/fruit_analysis.dart';
import '../../domain/usecases/watch_notifications_usecase.dart';
import '../history/history_bloc.dart';
import '../widgets/stage_badge.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final WatchNotificationsUseCase _watchNotifications;

  @override
  void initState() {
    super.initState();
    _watchNotifications = GetIt.I<WatchNotificationsUseCase>();
    _listenNotifications();
  }

  void _listenNotifications() {
    _watchNotifications().listen(
      (message) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.notifications_active,
                    color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text(message)),
              ],
            ),
            duration: const Duration(seconds: 4),
          ),
        );
        context.read<HistoryBloc>().add(const HistoryLoadEvent());
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [Color(0xFF2E7D32), Color(0xFF69F0AE)]),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.eco_rounded, size: 16, color: Colors.white),
            ),
            const SizedBox(width: 10),
            const Text('Zarza AI'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: 'Historial',
            onPressed: () => context.push('/history'),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _HeroCaptureCard(),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
            child: Text('Análisis recientes', style: theme.textTheme.titleMedium),
          ),
          Expanded(child: _RecentAnalysesList()),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'capture_fab',
        onPressed: () => context.push('/capture'),
        icon: const Icon(Icons.camera_alt_rounded),
        label: const Text('Analizar planta'),
      ),
    );
  }
}

// ── Hero card ─────────────────────────────────────────────────────────────────

class _HeroCaptureCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1B5E20), Color(0xFF2E7D32)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E7D32).withOpacity(0.35),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Captura una imagen',
                  style: Theme.of(context).textTheme.titleLarge!.copyWith(
                        color: Colors.white, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                Text(
                  'Identifica etapas fenológicas y días para cosecha.',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium!
                      .copyWith(color: Colors.white70),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF1B5E20),
                  ),
                  onPressed: () => context.push('/capture'),
                  icon: const Icon(Icons.camera_alt_rounded, size: 18),
                  label: const Text('Capturar'),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          const Icon(Icons.local_florist_rounded, size: 64, color: Colors.white24),
        ],
      ),
    );
  }
}

// ── Recent list ───────────────────────────────────────────────────────────────

class _RecentAnalysesList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<HistoryBloc, HistoryState>(
      builder: (context, state) {
        if (state is HistoryLoading || state is HistoryInitial) {
          return const Center(child: CircularProgressIndicator());
        }
        if (state is HistoryError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_off_rounded, size: 48, color: Colors.white24),
                  const SizedBox(height: 12),
                  Text(state.message,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white54)),
                ],
              ),
            ),
          );
        }
        if (state is HistoryLoaded && state.analyses.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.photo_camera_back_rounded,
                    size: 56, color: Colors.white24),
                const SizedBox(height: 12),
                Text(
                  'Aún no hay análisis.\nCaptura tu primera imagen.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium!
                      .copyWith(color: Colors.white38),
                ),
              ],
            ),
          );
        }
        final items = state is HistoryLoaded
            ? state.analyses.take(5).toList()
            : (state as HistoryLoadingMore).current.take(5).toList();
        return ListView.builder(
          padding: const EdgeInsets.only(bottom: 100),
          itemCount: items.length,
          itemBuilder: (context, i) => _AnalysisListTile(analysis: items[i]),
        );
      },
    );
  }
}

class _AnalysisListTile extends StatelessWidget {
  const _AnalysisListTile({required this.analysis});
  final FruitAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    final date = analysis.createdAt != null
        ? '${analysis.createdAt!.day}/${analysis.createdAt!.month}/${analysis.createdAt!.year}'
        : '—';
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/results/${analysis.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFF2E7D32).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.eco_rounded,
                    size: 22, color: Color(0xFF4CAF50)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${analysis.totalDetected} detectados · ${analysis.healthyCount} sanos',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(date,
                            style: Theme.of(context).textTheme.labelSmall),
                        const SizedBox(width: 8),
                        StatusBadge(status: analysis.status),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: Colors.white38, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
