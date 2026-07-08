import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/auth/auth_cubit.dart';
import '../../core/auth/auth_state.dart';
import '../../core/constants/ws_events.dart';
import '../../core/services/local_notifications_service.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/entities/notification_entity.dart';
import '../../domain/enums/user_role.dart';
import '../../domain/usecases/watch_notifications_usecase.dart';
import '../help/help_screen.dart';
import '../notifications/notifications_bell_widget.dart';
import '../notifications/notifications_bloc.dart';
import '../notifications/notifications_event.dart';

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

// Stable per-event-type IDs so notifications replace instead of stack.
const int _kNotifAnalisisListo    = 200;
const int _kNotifAnalysisValidated = 201;
const int _kNotifNuevaSolicitud   = 202;

class _ScaffoldWithBottomNavState extends State<ScaffoldWithBottomNav> {
  late final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  StreamSubscription<String>? _wsSub;
  final _notifications = GetIt.I<LocalNotificationsService>();

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

      int notifId;
      switch (event) {
        case WsEvents.analisisListo:
          notifId = _kNotifAnalisisListo;
          title = '¡Análisis listo!';
          body = 'Tu análisis ya está disponible en el historial.';

        case WsEvents.analysisValidated:
          notifId = _kNotifAnalysisValidated;
          final data = map['data'] as Map<String, dynamic>?;
          final action = data?['action'] as String? ?? '';
          title = action == 'validado' ? 'Análisis validado ✓' : 'Análisis rechazado';
          body = action == 'validado'
              ? 'Un agrónomo validó tu análisis.'
              : 'Un agrónomo rechazó tu análisis. Revisa las observaciones.';

        case WsEvents.nuevaSolicitud:
          notifId = _kNotifNuevaSolicitud;
          title = 'Nueva solicitud de muestreo';
          body = 'Tienes una nueva solicitud asignada. Revísala en Solicitudes.';

        default:
          return;
      }

      // ID estable por tipo → reemplaza la notificación anterior del mismo tipo.
      _notifications.showNotification(
        id: notifId,
        title: title,
        body: body,
      );

      // Crea la notificación y la añade al bloc
      if (mounted) {
        final notification = NotificationEntity(
          id: '${DateTime.now().millisecondsSinceEpoch}',
          type: event ?? '',
          title: title,
          body: body,
          data: map['data'] as Map<String, dynamic>? ?? {},
          isRead: false,
          createdAt: DateTime.now(),
          expiresAt: DateTime.now().add(const Duration(days: 7)),
        );
        context.read<NotificationsBloc>().add(WsNotificationReceived(notification));
      }

      // Snackbar en pantalla (solo si la app está en primer plano).
      // clearSnackBars evita que se apilen si llegan eventos duplicados.
      ScaffoldMessenger.of(context).clearSnackBars();
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
    } on Object {
      // Ignore malformed WebSocket messages
    }
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final selectedIndex = _selectedIndex(location);

    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                'assets/images/logo-rubus.png',
                width: 30,
                height: 30,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'RubusAI',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        actions: const [NotificationsBellWidget()],
        elevation: 0,
      ),
      drawer: BlocBuilder<AuthCubit, AuthState>(
        bloc: GetIt.I<AuthCubit>(),
        builder: (context, authState) {
          final user = authState is AuthAuthenticated ? authState.user : null;
          final userName = user?.displayName ?? '';
          return _AppDrawer(userName: userName);
        },
      ),
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
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.rubus.withValues(alpha: 0.4),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Image.asset(
                      'assets/images/logo-rubus.png',
                      width: 48,
                      height: 48,
                      fit: BoxFit.cover,
                    ),
                  ),
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
                            TextSpan(text: 'RubusAI'),
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
            title: const Text('Manual de Usuario',
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
