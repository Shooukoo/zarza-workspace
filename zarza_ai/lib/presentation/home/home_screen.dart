import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:get_it/get_it.dart';
import 'package:intl/intl.dart';

import '../../core/auth/auth_cubit.dart';
import '../../core/auth/auth_state.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/entities/fruit_analysis.dart';
import '../../domain/entities/pending_upload.dart';
import '../../domain/usecases/watch_pending_uploads_usecase.dart';
import '../help/help_screen.dart';
import '../history/history_bloc.dart';
import '../widgets/help_tooltip.dart';
import '../widgets/ring_progress.dart';
import '../widgets/stage_badge.dart';

String _formatExactDate(DateTime dt) {
  final formatter = DateFormat('d \'de\' MMMM \'·\' HH:mm', 'es_ES');
  return formatter.format(dt);
}

String _relativeTime(DateTime dt) {
  final diff = DateTime.now().difference(dt);
  if (diff.inMinutes < 60) return 'hace ${diff.inMinutes}m';
  if (diff.inHours < 24) return 'hace ${diff.inHours}h';
  return 'hace ${diff.inDays}d';
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _pendingCount = 0;
  StreamSubscription<List<PendingUpload>>? _queueSub;

  @override
  void initState() {
    super.initState();
    _queueSub = GetIt.I<WatchPendingUploadsUseCase>()().listen((items) {
      if (mounted) setState(() => _pendingCount = items.length);
    });
  }

  @override
  void dispose() {
    _queueSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = GetIt.I<AuthCubit>().state;
    final userName = authState is AuthAuthenticated
        ? authState.user.email.split('@').first
        : '';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.rubus, AppTheme.rubusLight],
                ),
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.rubus.withValues(alpha: 0.4),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(Icons.eco_rounded, size: 16, color: Colors.white),
            ),
            const SizedBox(width: 10),
            RichText(
              text: const TextSpan(
                style: TextStyle(
                  fontFamily: 'Lexend',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.frost,
                ),
                children: [
                  TextSpan(text: 'rubusAI'),
                  TextSpan(
                    text: '.mx',
                    style: TextStyle(color: AppTheme.rubus),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (_pendingCount > 0)
            Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  icon: const Icon(Icons.cloud_upload_outlined),
                  tooltip: 'Capturas pendientes',
                  onPressed: () => context.push('/queue'),
                ),
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppTheme.warn,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$_pendingCount',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
      drawer: _AppDrawer(userName: userName),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _UserGreeting(userName: userName),
          _HealthHeroCard(),
          const SizedBox(height: 4),
          _CaptureCtaButton(onPressed: () => context.push('/capture')),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
            child: Text(
              'Análisis Recientes',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          Expanded(child: _RecentAnalysesList()),
        ],
      ),
    );
  }
}

// ── User greeting row ─────────────────────────────────────────────────────────

class _UserGreeting extends StatelessWidget {
  const _UserGreeting({required this.userName});
  final String userName;

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Buenos días,'
        : hour < 18
            ? 'Buenas tardes,'
            : 'Buenas noches,';

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  greeting,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.dataGray,
                    fontFamily: 'Lexend',
                  ),
                ),
                Text(
                  userName.isEmpty ? 'Usuario' : userName,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.frost,
                    fontFamily: 'Lexend',
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF3D006A), AppTheme.rubus],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  fontFamily: 'Lexend',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Health hero card ──────────────────────────────────────────────────────────

class _HealthHeroCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<HistoryBloc, HistoryState>(
      builder: (context, state) {
        // Still loading or waiting — show static invite CTA
        if (state is HistoryInitial || state is HistoryLoading) {
          return _HeroCardShell(child: _HeroLoadingBody());
        }

        // Backend unreachable — show error state with retry hint
        if (state is HistoryError) {
          return _HeroCardShell(child: _HeroErrorBody(message: state.message));
        }

        final analyses = state is HistoryLoaded
            ? state.analyses
            : state is HistoryLoadingMore
                ? state.current
                : <FruitAnalysis>[];

        // Authenticated and loaded but no analyses yet — show CTA
        if (analyses.isEmpty) {
          return _HeroCardShell(child: _HeroEmptyBody());
        }

        // Happy path — show real health data
        final health = analyses.first.healthScore;
        final lastCapture = analyses.first.createdAt != null
            ? _relativeTime(analyses.first.createdAt!)
            : '—';
        final totalSick = analyses.fold(0, (s, a) => s + a.sickCount);
        final healthColor = health >= 70 ? AppTheme.emerald : AppTheme.warn;

        return _HeroCardShell(
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
                        Row(
                          children: [
                            const Text(
                              'SALUD DEL CULTIVO',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.06,
                                color: AppTheme.rubusLight,
                                fontFamily: 'Lexend',
                              ),
                            ),
                            const SizedBox(width: 6),
                            HelpTooltip(
                              content: 'La salud es el porcentaje promedio '
                                  'de frutas sanas. 100% = todas sanas, 0% = todas enfermas.',
                              maxWidth: 260,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              health.toStringAsFixed(0),
                              style: const TextStyle(
                                fontSize: 50,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.frost,
                                fontFamily: 'Lexend',
                                height: 1,
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
                        const SizedBox(height: 8),
                        _StatusBadge(
                          color: healthColor,
                          label: health >= 70 ? '● Óptimo' : '● Alerta',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  RingProgress(
                    value: health,
                    color: healthColor,
                    size: 80,
                    strokeWidth: 7,
                    child: Icon(Icons.eco_rounded, size: 22, color: healthColor),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 12),
              Row(
                children: [
                  _MiniStat(label: 'Análisis', value: '${analyses.length}'),
                  _MiniStat(label: 'Enfermedades', value: '$totalSick casos'),
                  _MiniStat(label: 'Última captura', value: lastCapture),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _HeroCardShell extends StatelessWidget {
  const _HeroCardShell({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1A0535), Color(0xFF2D0860), Color(0x557B00D4)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.rubus.withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(
            color: AppTheme.rubus.withValues(alpha: 0.18),
            blurRadius: 28,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _HeroLoadingBody extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'SALUD DEL CULTIVO',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.06,
                  color: AppTheme.rubusLight,
                  fontFamily: 'Lexend',
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Cargando datos...',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.frostDim,
                  fontFamily: 'Lexend',
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Conectando con el servidor',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.dataGray,
                  fontFamily: 'Lexend',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        SizedBox(
          width: 80,
          height: 80,
          child: Center(
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: AppTheme.rubus.withValues(alpha: 0.7),
            ),
          ),
        ),
      ],
    );
  }
}

class _HeroEmptyBody extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'SALUD DEL CULTIVO',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.06,
                  color: AppTheme.rubusLight,
                  fontFamily: 'Lexend',
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Sin análisis aún',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.frost,
                  fontFamily: 'Lexend',
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Captura tu primera imagen\npara comenzar el análisis.',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.dataGray,
                  fontFamily: 'Lexend',
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.rubus.withValues(alpha: 0.12),
            border: Border.all(color: AppTheme.rubus.withValues(alpha: 0.3)),
          ),
          child: const Icon(Icons.camera_alt_rounded,
              size: 32, color: AppTheme.rubusLight),
        ),
      ],
    );
  }
}

class _HeroErrorBody extends StatelessWidget {
  const _HeroErrorBody({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'SALUD DEL CULTIVO',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.06,
                  color: AppTheme.rubusLight,
                  fontFamily: 'Lexend',
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Sin conexión',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.frost,
                  fontFamily: 'Lexend',
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Verifica tu internet\ny vuelve a intentarlo.',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.dataGray,
                  fontFamily: 'Lexend',
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Reintentar'),
                onPressed: () {
                  context.read<HistoryBloc>().add(GetAnalysesEvent());
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.rubus,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.danger.withValues(alpha: 0.10),
            border:
                Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
          ),
          child: const Icon(Icons.cloud_off_rounded,
              size: 48, color: AppTheme.danger),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
          fontFamily: 'Lexend',
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
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
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppTheme.frostDim,
              fontFamily: 'Lexend',
            ),
          ),
        ],
      ),
    );
  }
}

// ── Quick capture CTA ─────────────────────────────────────────────────────────

class _CaptureCtaButton extends StatefulWidget {
  const _CaptureCtaButton({required this.onPressed});
  final VoidCallback onPressed;

  @override
  State<_CaptureCtaButton> createState() => _CaptureCtaButtonState();
}

class _CaptureCtaButtonState extends State<_CaptureCtaButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
      lowerBound: 0.0,
      upperBound: 0.04,
    );
    _scale =
        Tween<double>(begin: 1.0, end: 0.96).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
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
            height: 52,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.rubus, AppTheme.rubusLight],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.rubus.withValues(alpha: 0.45),
                  blurRadius: 20,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.camera_alt_rounded, color: Colors.white, size: 20),
                SizedBox(width: 10),
                Text(
                  'Capturar Análisis',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Lexend',
                    letterSpacing: 0.2,
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

// ── Recent analyses list ──────────────────────────────────────────────────────

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
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_rounded,
                    size: 48, color: AppTheme.warn),
                const SizedBox(height: 12),
                Text(
                  'Sin conexión',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                const Text(
                  'Verifica tu internet.',
                  style: TextStyle(color: AppTheme.dataGray),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: const Icon(Icons.refresh_rounded, size: 16),
                  label: const Text('Reintentar'),
                  onPressed: () {
                    context.read<HistoryBloc>().add(GetAnalysesEvent());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.rubus,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          );
        }
        final items = state is HistoryLoaded
            ? state.analyses.take(5).toList()
            : state is HistoryLoadingMore
                ? state.current.take(5).toList()
                : <FruitAnalysis>[];

        if (items.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.photo_camera_back_rounded,
                    size: 56, color: AppTheme.grayLine),
                const SizedBox(height: 12),
                Text(
                  'Aún no hay análisis.\nCaptura tu primera imagen.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium!
                      .copyWith(color: AppTheme.dataGray),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.only(top: 4, bottom: 24),
          itemCount: items.length,
          itemBuilder: (context, i) =>
              _AnalysisListTile(analysis: items[i]),
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
    final relativeTime = analysis.createdAt != null
        ? _relativeTime(analysis.createdAt!)
        : '—';
    final exactDate = analysis.createdAt != null
        ? _formatExactDate(analysis.createdAt!)
        : '—';
    final health = analysis.healthScore;
    final ringColor =
        health > 90 ? AppTheme.emerald : AppTheme.warn;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Material(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => context.push('/results/${analysis.id}'),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.07),
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Mini ring health indicator
                RingProgress(
                  value: health,
                  color: ringColor,
                  size: 44,
                  strokeWidth: 5,
                  child: Text(
                    health.toStringAsFixed(0),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.frost,
                      fontFamily: 'Lexend',
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${analysis.totalDetected} detectados · ${analysis.healthyCount} sanos',
                              style: Theme.of(context).textTheme.titleMedium,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          HelpTooltip(
                            content: 'Detectados = frutas analizadas. Sanos = sin enfermedades.',
                            maxWidth: 260,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            relativeTime,
                            style: Theme.of(context).textTheme.labelMedium,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            exactDate,
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: AppTheme.dataGray,
                                ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                StatusBadge(status: analysis.status),
                const SizedBox(width: 4),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppTheme.dataGray,
                  size: 18,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── App Drawer ────────────────────────────────────────────────────────────────

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({required this.userName});
  final String userName;

  @override
  Widget build(BuildContext context) {
    final authState = GetIt.I<AuthCubit>().state;
    final email =
        authState is AuthAuthenticated ? authState.user.email : '';

    return Drawer(
      child: Column(
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1A0535), AppTheme.obsidian2],
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
                    gradient: const LinearGradient(
                      colors: [Color(0xFF3D006A), AppTheme.rubus],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.rubus.withValues(alpha: 0.4),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.eco_rounded,
                      size: 24, color: Colors.white),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RichText(
                        text: const TextSpan(
                          style: TextStyle(
                            fontFamily: 'Lexend',
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.frost,
                          ),
                          children: [
                            TextSpan(text: 'rubusAI'),
                            TextSpan(
                              text: '.mx',
                              style: TextStyle(color: AppTheme.rubusLight),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        style: const TextStyle(
                          color: AppTheme.frostDim,
                          fontSize: 12,
                          fontFamily: 'Lexend',
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
            leading: const Icon(Icons.history_rounded,
                color: AppTheme.frostDim),
            title: const Text('Historial',
                style: TextStyle(
                    color: AppTheme.frost, fontFamily: 'Lexend')),
            onTap: () {
              Navigator.of(context).pop();
              context.push('/history');
            },
          ),
          ListTile(
            leading: const Icon(Icons.cloud_upload_outlined,
                color: AppTheme.frostDim),
            title: const Text('Capturas pendientes',
                style: TextStyle(
                    color: AppTheme.frost, fontFamily: 'Lexend')),
            onTap: () {
              Navigator.of(context).pop();
              context.push('/queue');
            },
          ),
          ListTile(
            leading: const Icon(Icons.help_outline_rounded,
                color: AppTheme.frostDim),
            title: const Text('📖 Manual de Usuario',
                style: TextStyle(
                    color: AppTheme.frost, fontFamily: 'Lexend')),
            onTap: () {
              Navigator.of(context).pop();
              Navigator.of(context).push<void>(
                MaterialPageRoute<void>(
                  builder: (context) => const HelpScreen(),
                ),
              );
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout_rounded,
                color: AppTheme.danger),
            title: const Text(
              'Cerrar sesión',
              style: TextStyle(
                  color: AppTheme.danger, fontFamily: 'Lexend'),
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
