import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:get_it/get_it.dart';

import '../../presentation/splash/splash_screen.dart';
import '../../presentation/home/home_screen.dart';
import '../../presentation/capture/capture_screen.dart';
import '../../presentation/capture/capture_bloc.dart';
import '../../presentation/results/results_screen.dart';
import '../../presentation/results/results_bloc.dart';
import '../../presentation/history/history_screen.dart';
import '../../presentation/history/history_bloc.dart';

class AppRouter {
  AppRouter._();

  static GoRouter get router => _router;

  static final GoRouter _router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => BlocProvider(
          create: (_) => GetIt.I<HistoryBloc>()..add(const HistoryLoadEvent()),
          child: const HomeScreen(),
        ),
      ),
      GoRoute(
        path: '/capture',
        builder: (context, state) => BlocProvider(
          create: (_) => GetIt.I<CaptureBloc>(),
          child: const CaptureScreen(),
        ),
      ),
      GoRoute(
        path: '/results/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return BlocProvider(
            create: (_) =>
                GetIt.I<ResultsBloc>()..add(ResultsLoadEvent(id: id)),
            child: const ResultsScreen(),
          );
        },
      ),
      GoRoute(
        path: '/history',
        builder: (context, state) => BlocProvider(
          create: (_) =>
              GetIt.I<HistoryBloc>()..add(const HistoryLoadEvent()),
          child: const HistoryScreen(),
        ),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Página no encontrada: ${state.error}'),
      ),
    ),
  );
}
