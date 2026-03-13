/// Central configuration for Zarza AI.
/// Replace [baseUrl] / [wsUrl] for physical device or production.
class AppConstants {
  AppConstants._();

  /// Android emulator loopback → host machine.
  /// For physical device: use your LAN IP, e.g. 'http://192.168.1.100:3001'
  static const String baseUrl = 'http://10.0.2.2:3001';
  static const String wsUrl = 'ws://10.0.2.2:3001';

  // Endpoints
  static const String uploadEndpoint = '/api/ingestion/upload';
  static const String fruitsEndpoint = '/api/fruits';

  // Upload timeout (analysis can take up to 60 s server-side)
  static const int uploadTimeoutSeconds = 90;
  static const int defaultPageSize = 20;
}
