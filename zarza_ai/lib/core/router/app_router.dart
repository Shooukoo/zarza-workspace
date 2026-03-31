import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:get_it/get_it.dart';

import '../../core/auth/auth_cubit.dart';
import '../../core/utils/platform_utils.dart';
import '../../core/auth/auth_state.dart';
import '../../presentation/splash/splash_screen.dart';
import '../../presentation/home/home_screen.dart';
import '../../presentation/capture/capture_screen.dart';
import '../../presentation/capture/capture_bloc.dart';
import '../../presentation/results/results_screen.dart';
import '../../presentation/results/results_bloc.dart';
import '../../presentation/history/history_screen.dart';
import '../../presentation/history/history_bloc.dart';
import '../../presentation/auth/login_screen.dart';
import '../../presentation/admin/create_user_screen.dart';
import '../../presentation/admin/admin_shell.dart';
import '../../presentation/admin/dashboard_page.dart';
import '../../presentation/admin/users_page.dart';
import '../../presentation/admin/analyses_page.dart';
import '../../presentation/admin/admin_blocs/admin_bloc.dart';
import '../di/service_locator.dart';

/// Rutas que no requieren autenticación.
const _publicRoutes = {'/login', '/'};

/// Rutas que requieren el rol ADMIN.
const _adminRoutes = {'/admin', '/admin/users', '/admin/analyses', '/admin/create-user'};

class AppRouter {
  AppRouter._();

  static GoRouter get router => _router;

  static final GoRouter _router = GoRouter(
    initialLocation: '/',
    refreshListenable: _GoRouterAuthNotifier(),
    redirect: (context, state) {
      final authState = GetIt.I<AuthCubit>().state;
      final isAuthenticated = authState is AuthAuthenticated;
      final isInitial = authState is AuthInitial;
      final isPublic = _publicRoutes.contains(state.matchedLocation);
      final isAdminRoute = _adminRoutes.any(
        (r) => state.matchedLocation.startsWith(r),
      );

      // Aún verificando sesión → no redirigir
      if (isInitial) return null;

      // Sin sesión y ruta protegida → login
      if (!isAuthenticated && !isPublic) return '/login';

      // Con sesión y en login → home o admin
      if (isAuthenticated && state.matchedLocation == '/login') {
        if (authState.user.role.canCreateUsers && PlatformUtils.useAdminLayout) {
          return '/admin';
        }
        return '/home';
      }

      // Ruta admin y usuario sin rol ADMIN → home
      if (isAdminRoute && authState is AuthAuthenticated) {
        if (!authState.user.role.canCreateUsers) return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),

      // ── Rutas de app móvil normal ────────────────────────────────────────
      GoRoute(
        path: '/home',
        builder: (context, state) {
          final authState = GetIt.I<AuthCubit>().state;
          final userId = authState is AuthAuthenticated ? authState.user.id : null;
          return BlocProvider(
            create: (_) =>
                sl<HistoryBloc>()..add(HistoryLoadEvent(userId: userId)),
            child: const HomeScreen(),
          );
        },
      ),
      GoRoute(
        path: '/capture',
        builder: (context, state) => BlocProvider(
          create: (_) => sl<CaptureBloc>(),
          child: const CaptureScreen(),
        ),
      ),
      GoRoute(
        path: '/results/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return BlocProvider(
            create: (_) =>
                sl<ResultsBloc>()..add(ResultsLoadEvent(id: id)),
            child: const ResultsScreen(),
          );
        },
      ),
      GoRoute(
        path: '/history',
        builder: (context, state) {
          final authState = GetIt.I<AuthCubit>().state;
          final userId = authState is AuthAuthenticated ? authState.user.id : null;
          return BlocProvider(
            create: (_) =>
                sl<HistoryBloc>()..add(HistoryLoadEvent(userId: userId)),
            child: const HistoryScreen(),
          );
        },
      ),

      // ── Panel de administración (web/desktop con sidebar) ────────────────
      ShellRoute(
        builder: (context, state, child) => BlocProvider(
          create: (_) => sl<AdminBloc>(),
          child: AdminShell(child: child),
        ),
        routes: [
          GoRoute(
            path: '/admin',
            builder: (context, state) => const DashboardPage(),
          ),
          GoRoute(
            path: '/admin/users',
            builder: (context, state) => const UsersPage(),
          ),
          GoRoute(
            path: '/admin/analyses',
            builder: (context, state) => const AnalysesPage(),
          ),
          GoRoute(
            path: '/admin/create-user',
            builder: (context, state) => const CreateUserScreen(),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Página no encontrada: ${state.error}'),
      ),
    ),
  );
}

/// Conecta el [AuthCubit] con el `refreshListenable` de [GoRouter].
class _GoRouterAuthNotifier extends ChangeNotifier {
  _GoRouterAuthNotifier() {
    GetIt.I<AuthCubit>().stream.listen((_) => notifyListeners());
  }
}
