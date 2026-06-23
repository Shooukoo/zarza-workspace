import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/capture_context.dart';
import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import 'solicitud_detail_bloc.dart';
import 'solicitudes_bloc.dart';

class SolicitudDetailScreen extends StatelessWidget {
  const SolicitudDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SolicitudDetailBloc, SolicitudDetailState>(
      listener: (context, state) {
        if (state is SolicitudDetailEstadoActualizado) {
          context.read<SolicitudesBloc>().add(
                SolicitudUpdateEstado(
                  id: state.solicitud.id,
                  estado: state.solicitud.estado,
                ),
              );
        }
        if (state is SolicitudDetailError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
      },
      builder: (context, state) {
        if (state is SolicitudDetailInitial) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final solicitud = switch (state) {
          SolicitudDetailLoaded(solicitud: final s) => s,
          SolicitudDetailUpdating(solicitud: final s) => s,
          SolicitudDetailEstadoActualizado(solicitud: final s) => s,
          SolicitudDetailError(solicitud: final s) => s,
          _ => null,
        };

        if (solicitud == null) return const SizedBox.shrink();
        final isUpdating = state is SolicitudDetailUpdating;

        return Scaffold(
          appBar: AppBar(
            title: Text(solicitud.campoNombre),
            leading: const BackButton(),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _InfoCard(solicitud: solicitud),
                const SizedBox(height: 24),
                if (!isUpdating)
                  _ActionButtons(solicitud: solicitud)
                else
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: CircularProgressIndicator(),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.solicitud});
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.assignment_rounded,
                    color: Color(0xFF4CAF50), size: 20),
                const SizedBox(width: 8),
                Text('Solicitud de muestreo',
                    style: theme.textTheme.labelMedium!
                        .copyWith(color: Colors.white54)),
                const Spacer(),
                _EstadoBadge(color: badgeColor, label: badgeText),
              ],
            ),
            const Divider(height: 24),
            _Row(icon: Icons.location_on_rounded, label: 'Campo', value: solicitud.campoNombre),
            const SizedBox(height: 12),
            _Row(icon: Icons.message_rounded, label: 'Instrucciones', value: solicitud.mensaje),
            if (fechaStr != null) ...[
              const SizedBox(height: 12),
              _Row(icon: Icons.calendar_today_rounded, label: 'Fecha límite', value: fechaStr),
            ],
          ],
        ),
      ),
    );
  }

  (Color, String) _badgeForEstado(EstadoSolicitud estado) => switch (estado) {
        EstadoSolicitud.pendiente => (Colors.grey, 'Pendiente'),
        EstadoSolicitud.enProgreso => (Colors.orange, 'En progreso'),
        EstadoSolicitud.completado => (const Color(0xFF4CAF50), 'Completado'),
        EstadoSolicitud.cancelado => (Colors.redAccent, 'Cancelado'),
      };
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Colors.white38),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: theme.textTheme.labelSmall!
                      .copyWith(color: Colors.white38)),
              const SizedBox(height: 2),
              Text(value, style: theme.textTheme.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionButtons extends StatelessWidget {
  const _ActionButtons({required this.solicitud});
  final SolicitudEntity solicitud;

  Future<void> _subirAnalisis(BuildContext context) async {
    final result = await context.push<String?>(
      '/capture',
      extra: CaptureContext(
        campoId: solicitud.campoId,
        solicitudId: solicitud.id,
      ),
    );
    if (result != null && context.mounted) {
      context.read<SolicitudDetailBloc>().add(const SolicitudDetailCompletar());
    }
  }

  @override
  Widget build(BuildContext context) {
    final estado = solicitud.estado;

    if (estado == EstadoSolicitud.completado ||
        estado == EstadoSolicitud.cancelado) {
      return const _ReadOnlyBanner();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (estado == EstadoSolicitud.pendiente)
          OutlinedButton.icon(
            onPressed: () => context
                .read<SolicitudDetailBloc>()
                .add(const SolicitudDetailMarcarEnProgreso()),
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Iniciar'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.orange,
              side:
                  BorderSide(color: Colors.orange.withValues(alpha: 0.5)),
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
        if (estado == EstadoSolicitud.pendiente) const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: () => _subirAnalisis(context),
          icon: const Icon(Icons.camera_alt_rounded),
          label: const Text('Subir análisis'),
          style: ElevatedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
        ),
      ],
    );
  }
}

class _ReadOnlyBanner extends StatelessWidget {
  const _ReadOnlyBanner();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white10,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Row(
        children: [
          Icon(Icons.info_outline_rounded, color: Colors.white38, size: 18),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Esta solicitud ya no admite cambios.',
              style: TextStyle(color: Colors.white54),
            ),
          ),
        ],
      ),
    );
  }
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
