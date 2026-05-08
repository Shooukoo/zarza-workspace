import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import 'solicitudes_bloc.dart';

class SolicitudesScreen extends StatelessWidget {
  const SolicitudesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocBuilder<SolicitudesBloc, SolicitudesState>(
        builder: (context, state) {
          if (state is SolicitudesLoading || state is SolicitudesInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is SolicitudesError) {
            return _ErrorView(
              message: state.message,
              onRetry: () =>
                  context.read<SolicitudesBloc>().add(const SolicitudesLoad()),
            );
          }

          final items = state is SolicitudesLoaded
              ? state.items
              : (state as SolicitudesLoadingMore).current;
          final hasMore = state is SolicitudesLoaded ? state.hasMore : false;

          if (items.isEmpty) return const _EmptyView();

          return RefreshIndicator(
            color: const Color(0xFF69F0AE),
            onRefresh: () async =>
                context.read<SolicitudesBloc>().add(const SolicitudesLoad()),
            child: CustomScrollView(
              slivers: [
                const SliverAppBar(
                  title: Text('Mis solicitudes'),
                  floating: true,
                  pinned: false,
                ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      if (index == items.length) {
                        return _LoadMoreButton(
                          isLoading: state is SolicitudesLoadingMore,
                          onTap: () => context
                              .read<SolicitudesBloc>()
                              .add(const SolicitudesLoadMore()),
                        );
                      }
                      return _SolicitudCard(solicitud: items[index]);
                    },
                    childCount: items.length + (hasMore ? 1 : 0),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SolicitudCard extends StatelessWidget {
  const _SolicitudCard({required this.solicitud});
  final SolicitudEntity solicitud;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (badgeColor, badgeText) = _badgeForEstado(solicitud.estado);

    String? fechaStr;
    if (solicitud.fechaLimite != null) {
      final f = solicitud.fechaLimite!;
      fechaStr = '${f.day}/${f.month}/${f.year}';
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/solicitudes/${solicitud.id}', extra: solicitud),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      solicitud.campoNombre,
                      style: theme.textTheme.titleMedium,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _EstadoBadge(color: badgeColor, label: badgeText),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                solicitud.mensaje,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall!.copyWith(color: Colors.white70),
              ),
              if (fechaStr != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        size: 13, color: Colors.white38),
                    const SizedBox(width: 4),
                    Text(
                      'Límite: $fechaStr',
                      style: theme.textTheme.labelSmall!
                          .copyWith(color: Colors.white38),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  (Color, String) _badgeForEstado(EstadoSolicitud estado) => switch (estado) {
        EstadoSolicitud.PENDIENTE => (Colors.grey, 'Pendiente'),
        EstadoSolicitud.EN_PROGRESO => (Colors.orange, 'En progreso'),
        EstadoSolicitud.COMPLETADO => (const Color(0xFF4CAF50), 'Completado'),
        EstadoSolicitud.CANCELADO => (Colors.redAccent, 'Cancelado'),
      };
}

class _EstadoBadge extends StatelessWidget {
  const _EstadoBadge({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
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
          side: BorderSide(
              color: const Color(0xFF2E7D32).withValues(alpha: 0.5)),
          minimumSize: const Size.fromHeight(46),
        ),
        child: isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Color(0xFF69F0AE)),
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
          const Icon(Icons.assignment_outlined, size: 64, color: Colors.white24),
          const SizedBox(height: 16),
          Text(
            'No tienes solicitudes asignadas.',
            style: Theme.of(context)
                .textTheme
                .bodyMedium!
                .copyWith(color: Colors.white38),
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
