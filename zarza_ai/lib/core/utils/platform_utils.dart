import 'package:flutter/foundation.dart';
import 'dart:io' show Platform;

/// Utilidades para detectar la plataforma en tiempo de ejecución.
/// Permite adaptar la UI según si corre en web, desktop o móvil.
class PlatformUtils {
  PlatformUtils._();

  /// `true` en browsers (Flutter Web).
  static bool get isWeb => kIsWeb;

  /// `true` en Windows, macOS o Linux (Flutter Desktop).
  static bool get isDesktop {
    if (kIsWeb) return false;
    return Platform.isWindows || Platform.isMacOS || Platform.isLinux;
  }

  /// `true` en Android o iOS.
  static bool get isMobile {
    if (kIsWeb) return false;
    return Platform.isAndroid || Platform.isIOS;
  }

  /// `true` cuando usar la interfaz de administración con sidebar.
  /// Se activa en web y desktop.
  static bool get useAdminLayout => isWeb || isDesktop;
}
