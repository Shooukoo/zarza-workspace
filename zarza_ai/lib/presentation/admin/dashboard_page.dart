import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../core/di/service_locator.dart';
import '../../../domain/entities/admin_stats_entity.dart';
import '../../../domain/entities/admin_dashboard_entity.dart';
import '../../../domain/enums/user_role.dart';
import 'admin_blocs/admin_bloc.dart';
import 'admin_blocs/admin_dashboard_bloc.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  // Use a local instance instead of reading from context if shell router didn't inject it globally, 
  // but it's fine to register it here. Actually let's create it locally or grab from SL.
  late final AdminDashboardBloc _dashboardBloc;

  @override
  void initState() {
    super.initState();
    // Fetch stats for the existing KPI cards
    context.read<AdminBloc>().add(const AdminLoadStats());

    // Initialize Dashboard Bloc
    _dashboardBloc = sl<AdminDashboardBloc>()..add(const LoadDashboardData());
  }

  @override
  void dispose() {
    _dashboardBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _dashboardBloc,
      child: Scaffold(
        backgroundColor: const Color(0xFF0A0A0A),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Inteligencia Agrícola',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Proyección de cosecha, salud del cultivo y estado fenológico',
                  style: GoogleFonts.outfit(color: Colors.white38, fontSize: 14),
                ),
                const SizedBox(height: 32),

                // ── AI Insights ────────────────────────────────────────────────
                BlocBuilder<AdminDashboardBloc, AdminDashboardState>(
                  builder: (context, state) {
                    if (state is DashboardLoading) {
                      return const Center(
                        child: CircularProgressIndicator(color: Color(0xFF4CAF50)),
                      );
                    }
                    if (state is DashboardError) {
                      return _ErrorView(
                        message: state.message,
                        onRetry: () => _dashboardBloc.add(const LoadDashboardData()),
                      );
                    }
                    if (state is DashboardLoaded) {
                      return _DashboardContent(
                        yieldForecast: state.yieldForecast,
                        healthMetrics: state.healthMetrics,
                        phenology: state.phenology,
                      );
                    }
                    return const SizedBox.shrink();
                  },
                ),

                const SizedBox(height: 48),

                // ── User Stats ──────────────────────────────────────────────────
                Text(
                  'Métricas de Plataforma',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 24),
                BlocBuilder<AdminBloc, AdminState>(
                  builder: (ctx, state) {
                    if (state is AdminLoading) return const SizedBox.shrink();
                    if (state is AdminStatsLoaded) {
                      return _StatsContent(stats: state.stats);
                    }
                    return const SizedBox.shrink();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Dashboard AI Charts ───────────────────────────────────────────────────────

class _DashboardContent extends StatelessWidget {
  const _DashboardContent({
    required this.yieldForecast,
    required this.healthMetrics,
    required this.phenology,
  });

  final List<YieldForecastEntity> yieldForecast;
  final HealthMetricsEntity healthMetrics;
  final List<PhenologyDistributionEntity> phenology;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 900;

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left column
              Expanded(
                flex: 2,
                child: Column(
                  children: [
                    _YieldChartCard(data: yieldForecast),
                    const SizedBox(height: 24),
                    _HealthMetricsCard(metrics: healthMetrics),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              // Right Column
              Expanded(
                flex: 1,
                child: _PhenologyPieChartCard(data: phenology),
              ),
            ],
          );
        }

        // Mobile / Narrow layout
        return Column(
          children: [
            _YieldChartCard(data: yieldForecast),
            const SizedBox(height: 24),
            _PhenologyPieChartCard(data: phenology),
            const SizedBox(height: 24),
            _HealthMetricsCard(metrics: healthMetrics),
          ],
        );
      },
    );
  }
}

class _YieldChartCard extends StatelessWidget {
  const _YieldChartCard({required this.data});
  final List<YieldForecastEntity> data;

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return _EmptyCard(title: 'Proyección de Cosecha');
    }

    return _CardContainer(
      title: 'Proyección de Cosecha (Libras/Kg)',
      child: SizedBox(
        height: 250,
        child: BarChart(
          BarChartData(
            alignment: BarChartAlignment.spaceAround,
            barTouchData: BarTouchData(
              enabled: true,
              touchTooltipData: BarTouchTooltipData(
                getTooltipColor: (_) => Colors.black87,
                getTooltipItem: (group, groupIndex, rod, rodIndex) {
                  return BarTooltipItem(
                    'En ${group.x} días\n',
                    const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    children: [
                      TextSpan(
                        text: '${rod.toY.toStringAsFixed(1)} kg',
                        style: const TextStyle(color: Color(0xFF4CAF50)),
                      ),
                    ],
                  );
                },
              ),
            ),
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              getDrawingHorizontalLine: (value) => FlLine(
                color: Colors.white12,
                strokeWidth: 1,
              ),
            ),
            titlesData: FlTitlesData(
              show: true,
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 30,
                  getTitlesWidget: (value, meta) {
                    return Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Text(
                        '${value.toInt()}d',
                        style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12),
                      ),
                    );
                  },
                ),
              ),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 42,
                  getTitlesWidget: (value, meta) {
                    if (value == 0) return const SizedBox.shrink();
                    return Text(
                      '${value.toInt()}kg',
                      style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12),
                    );
                  },
                ),
              ),
            ),
            borderData: FlBorderData(show: false),
            barGroups: data.map((e) {
              return BarChartGroupData(
                x: e.daysToHarvest,
                barRods: [
                  BarChartRodData(
                    toY: e.estimatedWeightGrams / 1000.0,
                    gradient: const LinearGradient(
                      colors: [Color(0xFF81C784), Color(0xFF2E7D32)],
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                    ),
                    width: 20,
                    borderRadius: BorderRadius.circular(6),
                    backDrawRodData: BackgroundBarChartRodData(
                      show: true,
                      toY: (e.estimatedWeightGrams / 1000.0) * 1.2, // Small headroom
                      color: const Color(0xFF1E1E1E),
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

class _PhenologyPieChartCard extends StatelessWidget {
  const _PhenologyPieChartCard({required this.data});
  final List<PhenologyDistributionEntity> data;

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return _EmptyCard(title: 'Distribución Fenológica');

    final total = data.fold<int>(0, (sum, item) => sum + item.count);
    
    final colorMap = {
      'maduro': const Color(0xFF2E0927),     // Dark purple
      'pintón': const Color(0xFFD32F2F),     // Red
      'rojo': const Color(0xFFFF5252),
      'verde': const Color(0xFF4CAF50),      // Green
      'flor': const Color(0xFFFFFFFF),       // White
    }; // Fallback for unexpected states is grey

    List<PieChartSectionData> sections = [];
    for (int i = 0; i < data.length; i++) {
      final item = data[i];
      final color = colorMap[item.stage.toLowerCase()] ?? Colors.grey;
      final percentage = (item.count / total) * 100;

      sections.add(
        PieChartSectionData(
          color: color,
          value: item.count.toDouble(),
          title: '${percentage.toStringAsFixed(1)}%',
          radius: 50,
          titleStyle: GoogleFonts.outfit(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      );
    }

    return _CardContainer(
      title: 'Distribución Fenológica',
      child: Column(
        children: [
          SizedBox(
            height: 200,
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 40,
                sections: sections,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: data.map((e) {
              final color = colorMap[e.stage.toLowerCase()] ?? Colors.grey;
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: color),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${e.stage.toUpperCase()} (${e.count})',
                    style: GoogleFonts.outfit(color: Colors.white70, fontSize: 12),
                  )
                ],
              );
            }).toList(),
          )
        ],
      ),
    );
  }
}

class _HealthMetricsCard extends StatelessWidget {
  const _HealthMetricsCard({required this.metrics});
  final HealthMetricsEntity metrics;

  @override
  Widget build(BuildContext context) {
    final lossColor = metrics.avgLossPercent > 15.0 
      ? Colors.redAccent 
      : (metrics.avgLossPercent > 5.0 ? Colors.orangeAccent : Colors.greenAccent);

    return _CardContainer(
      title: 'Monitoreo de Salud',
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _StatBlock(
            label: 'Merma Promedio',
            value: '${metrics.avgLossPercent.toStringAsFixed(1)}%',
            color: lossColor,
          ),
          _StatBlock(
            label: 'Frutos Enfermos',
            value: '${metrics.totalSickCount}',
            color: Colors.redAccent,
          ),
          _StatBlock(
            label: 'Total Detectados',
            value: '${metrics.totalDetected}',
            color: Colors.white,
          ),
        ],
      ),
    );
  }
}

class _StatBlock extends StatelessWidget {
  const _StatBlock({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.outfit(
            color: color,
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12),
        ),
      ],
    );
  }
}

class _CardContainer extends StatelessWidget {
  const _CardContainer({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF141414),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF1E1E1E)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 24),
          child,
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return _CardContainer(
      title: title,
      child: const SizedBox(
        height: 100,
        child: Center(
          child: Text(
            'No hay datos suficientes',
            style: TextStyle(color: Colors.white38),
          ),
        ),
      ),
    );
  }
}

// ── User Stats UI (Legacy) ──────────────────────────────────────────────────

class _StatsContent extends StatelessWidget {
  const _StatsContent({required this.stats});
  final AdminStatsEntity stats;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _KpiCard(
              icon: Icons.group_rounded,
              label: 'Total Usuarios',
              value: stats.totalUsers.toString(),
              color: const Color(0xFF4CAF50),
            ),
            _KpiCard(
              icon: Icons.admin_panel_settings_rounded,
              label: 'Administradores',
              value: (stats.usersByRole[UserRole.admin] ?? 0).toString(),
              color: const Color(0xFF7C4DFF),
            ),
            _KpiCard(
              icon: Icons.agriculture_rounded,
              label: 'Productores',
              value: (stats.usersByRole[UserRole.productor] ?? 0).toString(),
              color: const Color(0xFF00BCD4),
            ),
            _KpiCard(
              icon: Icons.science_rounded,
              label: 'Agrónomos',
              value: (stats.usersByRole[UserRole.agronomo] ?? 0).toString(),
              color: const Color(0xFFFF9800),
            ),
            _KpiCard(
              icon: Icons.visibility_rounded,
              label: 'Monitores',
              value: (stats.usersByRole[UserRole.monitor] ?? 0).toString(),
              color: const Color(0xFF607D8B),
            ),
          ],
        ),
        const SizedBox(height: 32),
        Text(
          'Distribución por rol',
          style: GoogleFonts.outfit(
            color: Colors.white70,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 16),
        ...UserRole.values.map((role) {
          final count = stats.usersByRole[role] ?? 0;
          final pct = stats.totalUsers > 0 ? count / stats.totalUsers : 0.0;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _RoleBar(role: role, count: count, percent: pct),
          );
        }),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 180,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF141414),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E1E1E)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 14),
          Text(
            value,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.outfit(color: Colors.white38, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _RoleBar extends StatelessWidget {
  const _RoleBar({
    required this.role,
    required this.count,
    required this.percent,
  });
  final UserRole role;
  final int count;
  final double percent;

  static const _colors = {
    UserRole.admin: Color(0xFF7C4DFF),
    UserRole.productor: Color(0xFF00BCD4),
    UserRole.agronomo: Color(0xFFFF9800),
    UserRole.monitor: Color(0xFF607D8B),
  };

  @override
  Widget build(BuildContext context) {
    final color = _colors[role] ?? const Color(0xFF4CAF50);
    return Row(
      children: [
        SizedBox(
          width: 90,
          child: Text(
            role.displayName,
            style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percent,
              backgroundColor: const Color(0xFF1E1E1E),
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 8,
            ),
          ),
        ),
        const SizedBox(width: 12),
        SizedBox(
          width: 24,
          child: Text(
            '$count',
            style: GoogleFonts.outfit(
              color: Colors.white54,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline_rounded,
              color: Colors.redAccent, size: 48),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: Colors.white54)),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4CAF50),
            ),
            onPressed: onRetry,
            child: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }
}
