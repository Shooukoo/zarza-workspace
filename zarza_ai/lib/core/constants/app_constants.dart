import 'dart:io';

/// Central configuration for Zarza AI.
/// Selects the correct host depending on the platform:
///   - Android emulator → 10.0.2.2 (loopback alias to host machine)
///   - Windows / macOS / Linux desktop → localhost
///   - Physical device → change [_lanIp] to your LAN IP
class AppConstants {
  AppConstants._();

  /// LAN IP for physical devices. Update before testing on a real phone.
  static const String _lanIp = '192.168.1.100';

  /// Returns the correct host for the current platform.
  static String get _host {
    if (Platform.isAndroid) return '10.0.2.2';
    if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      return '127.0.0.1'; // <-- Cambio clave aquí
    }
    return _lanIp; // iOS physical device or unknown
  }

  static String get baseUrl => 'http://$_host:3001';
  static String get wsUrl  => 'ws://$_host:3001';

  // Endpoints
  static const String uploadEndpoint = '/api/ingestion/upload';
  static const String fruitsEndpoint = '/api/fruits';

  // Auth endpoints
  static const String loginEndpoint = '/api/auth/login';
  static const String registerEndpoint = '/api/auth/register';

  // Admin endpoints
  static const String adminUsersEndpoint = '/api/admin/users';
  static const String adminStatsEndpoint = '/api/admin/stats';

  // Upload timeout (analysis can take up to 60 s server-side)
  static const int uploadTimeoutSeconds = 90;
  static const int defaultPageSize = 20;
}
