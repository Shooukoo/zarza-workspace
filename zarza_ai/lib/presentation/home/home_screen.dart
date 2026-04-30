import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:get_it/get_it.dart';

import '../../core/auth/auth_cubit.dart';
import '../../core/auth/auth_state.dart';
import '../../core/services/local_notifications_service.dart';
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
  StreamSubscription<String>? _notificationSub;

  @override
  void initState() {
    super.initState();
    _watchNotifications = GetIt.I<WatchNotificationsUseCase>();
    _listenNotifications();
  }

  @override
  void dispose() {
    _notificationSub?.cancel();
    super.dispose();
  }

  void _listenNotifications() {
    _notificationSub = _watchNotifications().listen(
      (message) {
        if (!mounted) return;
        
        String cleanMessage = "Análisis completado";
        String notificationTitle = "Zarza AI";
        
        try {
          final map = jsonDecode(message) as Map<String, dynamic>;
          if (map['event'] == 'analisis_listo' && map['data'] != null) {
            final data = map['data'];
            final detections = data['cronograma_fenologico'] ?? data['detections'] ?? [];
            if (detections.isNotEmpty) {
              final dominant = detections[0];
              final stage = dominant['stage'] ?? dominant['label'] ?? 'General';
              final weight = dominant['estimatedWeightGrams'] ?? 0.0;
              final days = dominant['daysToHarvest'] ?? 0;
              
              cleanMessage = 'Etapa: $stage | Peso: ${weight}g | Cosecha: $days días';
              notificationTitle = '¡Análisis Listo!';
            }
          }
        } catch (_) {
          // Fallback if parsing fails
          cleanMessage = "Tienes un nuevo resultado de análisis.";
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.notifications_active,
                    color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text(cleanMessage)),
              ],
            ),
            duration: const Duration(seconds: 4),
          ),
        );
        
        GetIt.I<LocalNotificationsService>().showNotification(
          id: DateTime.now().millisecondsSinceEpoch.remainder(100000),
          title: notificationTitle,
          body: cleanMessage,
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
      ),
      drawer: const _AppDrawer(),
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
          _AnalyzeButton(onPressed: () => context.push('/capture')),
        ],
      ),
    );
  }
}

// ── App Drawer ───────────────────────────────────────────────────────────────

class _AppDrawer extends StatelessWidget {
  const _AppDrawer();

  @override
  Widget build(BuildContext context) {
    final authState = GetIt.I<AuthCubit>().state;
    final email = authState is AuthAuthenticated ? authState.user.email : '';

    return Drawer(
      child: Column(
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1B5E20), Color(0xFF2E7D32)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.eco_rounded, size: 28, color: Colors.white),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Zarza AI',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.history_rounded),
            title: const Text('Historial'),
            onTap: () {
              Navigator.of(context).pop();
              context.push('/history');
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
            title: const Text(
              'Cerrar sesión',
              style: TextStyle(color: Colors.redAccent),
            ),
            onTap: () {
              Navigator.of(context).pop();
              GetIt.I<AuthCubit>().logout();
            },
          ),
          const Spacer(),
        ],
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
            color: const Color(0xFF2E7D32).withValues(alpha: 0.35),
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
                  color: const Color(0xFF2E7D32).withValues(alpha: 0.15),
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

// ── Analyze Button ────────────────────────────────────────────────────────────

class _AnalyzeButton extends StatefulWidget {
  const _AnalyzeButton({required this.onPressed});
  final VoidCallback onPressed;

  @override
  State<_AnalyzeButton> createState() => _AnalyzeButtonState();
}

class _AnalyzeButtonState extends State<_AnalyzeButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
      lowerBound: 0.0,
      upperBound: 0.04,
    );
    _scale = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      child: GestureDetector(
        onTapDown: (_) => _controller.forward(),
        onTapUp: (_) {
          _controller.reverse();
          widget.onPressed();
        },
        onTapCancel: () => _controller.reverse(),
        child: ScaleTransition(
          scale: _scale,
          child: Container(
            height: 58,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1B5E20), Color(0xFF43A047)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF2E7D32).withValues(alpha: 0.5),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.camera_alt_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  'Analizar planta',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
