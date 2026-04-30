import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:zarza_ai/core/services/connectivity_service.dart';

import 'connectivity_service_test.mocks.dart';

@GenerateMocks([Connectivity])
void main() {
  late MockConnectivity mockConnectivity;
  late ConnectivityService service;

  setUp(() {
    mockConnectivity = MockConnectivity();
    service = ConnectivityService(mockConnectivity);
  });

  test('isConnected returns false when ConnectivityResult.none', () async {
    when(mockConnectivity.checkConnectivity())
        .thenAnswer((_) async => [ConnectivityResult.none]);
    expect(await service.isConnected(), isFalse);
  });

  test('isConnected returns true when wifi available', () async {
    when(mockConnectivity.checkConnectivity())
        .thenAnswer((_) async => [ConnectivityResult.wifi]);
    expect(await service.isConnected(), isTrue);
  });
}
