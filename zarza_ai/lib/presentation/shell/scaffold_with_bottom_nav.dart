import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/ws_events.dart';
import '../../core/services/local_notifications_service.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';
import '../../domain/usecases/watch_notifications_usecase.dart';

class ScaffoldWithBottomNav extends StatefulWidget {
  const ScaffoldWithBottomNav({
    super.key,
    required this.child,
    required this.user,
  });

  final Widget child;
  final UserEntity? user;

  @override
  State<ScaffoldWithBottomNav> createState() => _ScaffoldWithBottomNavState();
}

class _ScaffoldWithBottomNavState extends State<ScaffoldWithBottomNav> {
  StreamSubscription<String>? _wsSub;
  final _notifications = GetIt.I<LocalNotificationsService>();
  int _notifId = 1;

  bool get _canSeeSolicitudes =>
      widget.user?.role == UserRole.monitor ||
      widget.user?.role == UserRole.agronomo;

  @override
  void initState() {
    super.initState();
    _wsSub = GetIt.I<WatchNotificationsUseCase>()().listen(_onWsEvent);
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    super.dispose();
  }

  void _onWsEvent(String raw) {
    if (!mounted) return;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final event = map['event'] as String?;

      String? title;
      String? body;

      switch (event) {
        case WsEvents.analisisListo:
          title = '¡Análisis listo!';
          body = 'Tu análisis ya está disponible en el historial.';

        case WsEvents.analysisValidated:
          final data = map['data'] as Map<String, dynamic>?;
          final action = data?['action'] as String? ?? '';
          title = action == 'validado' ? 'Análisis validado ✓' : 'Análisis rechazado';
          body = action == 'validado'
              ? 'Un agrónomo validó tu análisis.'
              : 'Un agrónomo rechazó tu análisis. Revisa las observaciones.';

        case WsEvents.nuevaSolicitud:
          title = 'Nueva solicitud de muestreo';
          body = 'Tienes una nueva solicitud asignada. Revísala en Solicitudes.';

        default:
          return;
      }

      // Notificación del sistema (aparece aunque la app esté en segundo plano)
      _notifications.showNotification(
        id: _notifId++,
        title: title,
        body: body,
      );

      // Snackbar en pantalla (solo si la app está en primer plano)
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.notifications_active_rounded,
                  color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(body)),
            ],
          ),
          duration: const Duration(seconds: 4),
          action: event == WsEvents.nuevaSolicitud && _canSeeSolicitudes
              ? SnackBarAction(
                  label: 'Ver',
                  onPressed: () => context.go('/solicitudes'),
                )
              : event == WsEvents.analisisListo || event == WsEvents.analysisValidated
                  ? SnackBarAction(
                      label: 'Ver',
                      onPressed: () => context.go('/history'),
                    )
                  : null,
        ),
      );
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final selectedIndex = _selectedIndex(location);

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => _onTap(context, index),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Inicio',
          ),
          if (_canSeeSolicitudes)
            const NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment_rounded),
              label: 'Solicitudes',
            ),
          const NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history_rounded),
            label: 'Historial',
          ),
        ],
      ),
    );
  }

  int _selectedIndex(String location) {
    if (_canSeeSolicitudes) {
      if (location.startsWith('/solicitudes')) return 1;
      if (location.startsWith('/history')) return 2;
      return 0;
    } else {
      if (location.startsWith('/history')) return 1;
      return 0;
    }
  }

  void _onTap(BuildContext context, int index) {
    if (_canSeeSolicitudes) {
      switch (index) {
        case 0:
          context.go('/home');
        case 1:
          context.go('/solicitudes');
        case 2:
          context.go('/history');
      }
    } else {
      switch (index) {
        case 0:
          context.go('/home');
        case 1:
          context.go('/history');
      }
    }
  }
}
