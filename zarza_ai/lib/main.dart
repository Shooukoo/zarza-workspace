import 'dart:developer' as developer;
import 'dart:ui';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:get_it/get_it.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'core/auth/auth_cubit.dart';
import 'core/di/service_locator.dart';
import 'core/router/app_router.dart';
import 'core/services/auto_sync_service.dart';
import 'core/services/fcm_service.dart';
import 'core/services/sync_service.dart';
import 'core/theme/app_theme.dart';
import 'domain/entities/campo_entity.dart';
import 'domain/usecases/get_campos_usecase.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('es_ES');
  await Firebase.initializeApp();

  // Debe registrarse aquí, en el isolate principal, antes de runApp.
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  // Global safety net: swallow WebSocketChannelException del backend offline
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    if (error is WebSocketChannelException) {
      developer.log('[WS] Swallowed exception', error: error, stackTrace: stack);
      return true;
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

  // Inicializar FCM (pide permisos y registra token si hay sesión activa)
  sl<FcmService>().init().catchError((_) {}).ignore();

  // Pre-cargar campos en caché sin bloquear arranque
  sl<GetCamposUseCase>()().catchError((Object _) => <CampoEntity>[]).ignore();

  // Sincronizar cola pendiente sin bloquear arranque
  sl<SyncService>().syncPending().catchError((_) {}).ignore();

  // Iniciar listener de reconexión automática
  sl<AutoSyncService>().start();

  runApp(const ZarzaAiApp());
}

class ZarzaAiApp extends StatelessWidget {
  const ZarzaAiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<AuthCubit>(
      create: (_) => GetIt.I<AuthCubit>(),
      child: MaterialApp.router(
        title: 'RubusAI',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        routerConfig: AppRouter.router,
      ),
    );
  }
}
