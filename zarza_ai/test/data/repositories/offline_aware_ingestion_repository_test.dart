import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:zarza_ai/core/services/connectivity_service.dart';
import 'package:zarza_ai/core/services/local_notifications_service.dart';
import 'package:zarza_ai/data/datasources/remote_ingestion_datasource.dart';
import 'package:zarza_ai/data/repositories/offline_aware_ingestion_repository.dart';
import 'package:zarza_ai/domain/entities/pending_upload.dart';
import 'package:zarza_ai/domain/entities/upload_metadata.dart';
import 'package:zarza_ai/domain/repositories/i_offline_queue_repository.dart';

import 'offline_aware_ingestion_repository_test.mocks.dart';

@GenerateMocks([
  ConnectivityService,
  IOfflineQueueRepository,
  RemoteIngestionDatasource,
  LocalNotificationsService,
])
void main() {
  late MockConnectivityService mockConn;
  late MockIOfflineQueueRepository mockQueue;
  late MockRemoteIngestionDatasource mockRemote;
  late MockLocalNotificationsService mockNotif;
  late OfflineAwareIngestionRepository repo;

  final metadata = UploadMetadata(
    campoId: 'campo-1',
    capturedAt: DateTime(2026),
    offlineSyncId: 'sync-uuid-1',
  );

  group('when offline', () {
    late Directory tempDir;
    late File fakeFile;

    setUp(() async {
      mockConn = MockConnectivityService();
      mockQueue = MockIOfflineQueueRepository();
      mockRemote = MockRemoteIngestionDatasource();
      mockNotif = MockLocalNotificationsService();

      // Use a real temp dir so image.copy() works; inject it to avoid
      // path_provider platform channel call
      tempDir = await Directory.systemTemp.createTemp('zarza_test_');
      fakeFile = File('${tempDir.path}/test.jpg');
      await fakeFile.writeAsBytes([0xFF, 0xD8, 0xFF]); // minimal JPEG bytes

      repo = OfflineAwareIngestionRepository(
        remote: mockRemote,
        queue: mockQueue,
        connectivity: mockConn,
        notifications: mockNotif,
        directoryResolver: () async => tempDir,
      );

      when(mockConn.isConnected()).thenAnswer((_) async => false);
      when(mockQueue.enqueue(any)).thenAnswer((_) async {});
      when(mockQueue.countPending()).thenAnswer((_) async => 1);
      when(mockNotif.showQueuedNotification(any)).thenAnswer((_) async {});
    });

    tearDown(() async {
      if (await tempDir.exists()) await tempDir.delete(recursive: true);
    });

    test('enqueues item and returns QUEUED status', () async {
      final result = await repo.uploadImage(fakeFile, metadata);
      expect(result.status, equals('QUEUED'));
      expect(result.imageId, equals('sync-uuid-1'));
      verify(mockQueue.enqueue(any)).called(1);
      verify(mockNotif.showQueuedNotification(1)).called(1);
    });
  });
}
