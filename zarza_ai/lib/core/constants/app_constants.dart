import '../config/env_config.dart';

/// Central configuration for RubusAI.
///
/// Las URLs dependen del flavor activo (`flutter run --flavor dev|staging|prod`);
/// ver [EnvConfig]. En dev se puede sobreescribir el host con
/// `--dart-define=SERVER_HOST=<ip>` (ej. dispositivo físico en LAN).
class AppConstants {
  AppConstants._();

  static String get baseUrl => EnvConfig.baseUrl;
  static String get wsUrl => EnvConfig.wsUrl;

  // Endpoints
  static const String uploadEndpoint = '/api/v1/ingestion/upload';
  static const String fruitsEndpoint = '/api/v1/fruits';
  static const String solicitudesEndpoint = '/api/v1/solicitudes';
  static const String analysesEndpoint = '/api/v1/analyses';
  

  // Auth endpoints
  static const String loginEndpoint = '/api/v1/auth/login';
  static const String registerEndpoint = '/api/v1/auth/register';
  static const String refreshEndpoint = '/api/v1/auth/refresh';

  // Admin endpoints
  static const String adminUsersEndpoint = '/api/v1/admin/users';
  static const String adminStatsEndpoint = '/api/v1/admin/stats';

  // Upload timeout (analysis can take up to 60 s server-side)
  static const int uploadTimeoutSeconds = 90;
  static const int defaultPageSize = 20;
}
