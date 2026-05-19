import 'dart:io';

/// Central configuration for RubusAI.
///
/// El host se puede sobreescribir con --dart-define=SERVER_HOST=<ip>
///   flutter run --dart-define=SERVER_HOST=192.168.100.26
///
/// Si no se pasa, el default es:
///   - Android → 10.0.2.2 (emulador)
///   - Desktop → 127.0.0.1
class AppConstants {
  AppConstants._();

  static const String _envHost = String.fromEnvironment('SERVER_HOST');

  static String get _host {
    if (_envHost.isNotEmpty) return _envHost;
    if (Platform.isAndroid) return '10.0.2.2';
    return '127.0.0.1';
  }

  static const bool _isDev = bool.fromEnvironment('IS_DEV', defaultValue: true);

  static String get baseUrl =>
      _isDev ? 'http://$_host:3001' : 'https://$_host';
  static String get wsUrl =>
      _isDev ? 'ws://$_host:3001/ws' : 'wss://$_host/ws';

  // Endpoints
  static const String uploadEndpoint = '/api/ingestion/upload';
  static const String fruitsEndpoint = '/api/fruits';
  static const String solicitudesEndpoint = '/api/solicitudes';

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
