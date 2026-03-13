import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'core/di/service_locator.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Global safety net: swallow WebSocketChannelException that may escape
  // while the backend is not yet running. Real errors still show in debug.
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    if (error is WebSocketChannelException) {
      // Backend offline — suppress; WebSocketDatasource handles reconnect.
      return true; // true = handled, do not re-throw
    }
    // Let all other errors propagate normally.
    return false;
  };

  // Lock portrait orientation for optimal plant-photography UX
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Status bar / nav bar appearance
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0A0A0A),
  ));

  await setupServiceLocator();

  runApp(const ZarzaAiApp());
}

class ZarzaAiApp extends StatelessWidget {
  const ZarzaAiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Zarza AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      routerConfig: AppRouter.router,
    );
  }
}
