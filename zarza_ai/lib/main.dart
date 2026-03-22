import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'core/auth/auth_cubit.dart';
import 'core/di/service_locator.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Global safety net: swallow WebSocketChannelException del backend offline
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    if (error is WebSocketChannelException) {
      return true; // handled, no re-throw
    }
    return false;
  };

  // Bloquear orientación portrait 
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Status/nav bar appearance
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0A0A0A),
  ));

  // Configurar DI (también llama AuthCubit.checkSession internamente)
  await setupServiceLocator();

  runApp(const ZarzaAiApp());
}

class ZarzaAiApp extends StatelessWidget {
  const ZarzaAiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<AuthCubit>(
      create: (_) => GetIt.I<AuthCubit>(),
      child: MaterialApp.router(
        title: 'Zarza AI',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        routerConfig: AppRouter.router,
      ),
    );
  }
}
