import 'dart:io';

import 'package:flutter/services.dart' show appFlavor;

/// Entornos de la app, uno por flavor nativo de Android.
enum Environment { dev, staging, prod }

/// Configuración por entorno resuelta desde el flavor activo (`--flavor`).
///
/// `appFlavor` es null en `flutter test`, web y Windows (plataformas sin
/// soporte de flavors) → caen a [Environment.dev].
class EnvConfig {
  EnvConfig._();

  /// Solo dev: `--dart-define=SERVER_HOST=<ip>` para probar contra un
  /// backend en la LAN desde un dispositivo físico.
  static const String _devHostOverride = String.fromEnvironment('SERVER_HOST');

  static final Environment current = environmentFromFlavor(appFlavor);

  static Environment environmentFromFlavor(String? flavor) {
    switch (flavor) {
      case 'staging':
        return Environment.staging;
      case 'prod':
        return Environment.prod;
      default:
        return Environment.dev;
    }
  }

  static String get baseUrl => baseUrlFor(current);
  static String get wsUrl => wsUrlFor(current);

  static String baseUrlFor(Environment env) {
    switch (env) {
      case Environment.dev:
        return 'http://$_devHost:3001';
      case Environment.staging:
        // Placeholder: reemplazar cuando exista el backend de staging.
        return 'https://staging.api.zarza.example';
      case Environment.prod:
        // Placeholder: reemplazar cuando exista el backend de producción.
        return 'https://api.zarza.example';
    }
  }

  static String wsUrlFor(Environment env) {
    switch (env) {
      case Environment.dev:
        return 'ws://$_devHost:3001/ws';
      case Environment.staging:
        return 'wss://staging.api.zarza.example/ws';
      case Environment.prod:
        return 'wss://api.zarza.example/ws';
    }
  }

  static String get _devHost {
    if (_devHostOverride.isNotEmpty) return _devHostOverride;
    if (Platform.isAndroid) return '10.0.2.2';
    return '127.0.0.1';
  }
}
