import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/core/config/env_config.dart';

void main() {
  group('EnvConfig.environmentFromFlavor', () {
    test('null resuelve a dev (flutter test, web, windows)', () {
      expect(EnvConfig.environmentFromFlavor(null), Environment.dev);
    });

    test('cada flavor resuelve a su entorno', () {
      expect(EnvConfig.environmentFromFlavor('dev'), Environment.dev);
      expect(EnvConfig.environmentFromFlavor('staging'), Environment.staging);
      expect(EnvConfig.environmentFromFlavor('prod'), Environment.prod);
    });

    test('flavor desconocido resuelve a dev', () {
      expect(EnvConfig.environmentFromFlavor('qa'), Environment.dev);
    });
  });

  group('URLs por entorno', () {
    test('dev usa http://127.0.0.1:3001 en host de tests', () {
      // En tests Platform.isAndroid es false y no hay SERVER_HOST definido.
      expect(EnvConfig.baseUrlFor(Environment.dev), 'http://127.0.0.1:3001');
      expect(EnvConfig.wsUrlFor(Environment.dev), 'ws://127.0.0.1:3001/ws');
    });

    test('staging usa https/wss con dominio de staging', () {
      expect(
        EnvConfig.baseUrlFor(Environment.staging),
        'https://staging.api.zarza.example',
      );
      expect(
        EnvConfig.wsUrlFor(Environment.staging),
        'wss://staging.api.zarza.example/ws',
      );
    });

    test('prod usa https/wss con dominio de prod', () {
      expect(EnvConfig.baseUrlFor(Environment.prod), 'https://api.zarza.example');
      expect(EnvConfig.wsUrlFor(Environment.prod), 'wss://api.zarza.example/ws');
    });

    test('current es dev bajo flutter test y baseUrl/wsUrl delegan en él', () {
      expect(EnvConfig.current, Environment.dev);
      expect(EnvConfig.baseUrl, EnvConfig.baseUrlFor(Environment.dev));
      expect(EnvConfig.wsUrl, EnvConfig.wsUrlFor(Environment.dev));
    });
  });
}
