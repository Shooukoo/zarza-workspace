import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/core/config/env_config.dart';
import 'package:zarza_ai/core/constants/app_constants.dart';

void main() {
  test('AppConstants delega baseUrl/wsUrl en EnvConfig', () {
    expect(AppConstants.baseUrl, EnvConfig.baseUrl);
    expect(AppConstants.wsUrl, EnvConfig.wsUrl);
  });

  test('bajo flutter test apunta al backend local de dev', () {
    expect(AppConstants.baseUrl, 'http://127.0.0.1:3001');
    expect(AppConstants.wsUrl, 'ws://127.0.0.1:3001/ws');
  });
}
