import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:zarza_ai/core/services/local_notifications_service.dart';
import 'package:zarza_ai/core/services/sync_service.dart';
import 'package:zarza_ai/data/datasources/remote_ingestion_datasource.dart';
import 'package:zarza_ai/data/models/upload_response_model.dart';
import 'package:zarza_ai/domain/entities/pending_upload.dart';
import 'package:zarza_ai/domain/repositories/i_offline_queue_repository.dart';

import 'sync_service_test.mocks.dart';

@GenerateMocks([
  IOfflineQueueRepository,
  RemoteIngestionDatasource,
  LocalNotificationsService,
])
void main() {
  late MockIOfflineQueueRepository mockQueue;
  late MockRemoteIngestionDatasource mockRemote;
  late MockLocalNotificationsService mockNotif;
  late SyncService service;

  final item = PendingUpload(
    offlineSyncId: 'sync-1',
    imagePath: '/nonexistent/path.jpg',
    campoId: 'campo-1',
    capturedAt: DateTime(2026),
    queuedAt: DateTime(2026),
    status: PendingUploadStatus.pending,
  );

  setUp(() {
    mockQueue = MockIOfflineQueueRepository();
    mockRemote = MockRemoteIngestionDatasource();
    mockNotif = MockLocalNotificationsService();
    service = SyncService(
      queue: mockQueue,
      remote: mockRemote,
      notifications: mockNotif,
    );

    when(mockQueue.resetSyncing()).thenAnswer((_) async {});
    when(mockQueue.countPending()).thenAnswer((_) async => 0);
    when(mockNotif.dismissSyncNotification()).thenAnswer((_) async {});
    when(mockNotif.showQueuedNotification(any)).thenAnswer((_) async {});
    when(mockNotif.updateSyncProgress(any, any)).thenAnswer((_) async {});
    when(mockNotif.showFailedNotification(any)).thenAnswer((_) async {});
  });

  test('resets syncing items on start', () async {
    when(mockQueue.getPending()).thenAnswer((_) async => []);
    await service.syncPending();
    verify(mockQueue.resetSyncing()).called(1);
  });

  test('dismisses notification when queue is empty', () async {
    when(mockQueue.getPending()).thenAnswer((_) async => []);
    await service.syncPending();
    verify(mockNotif.dismissSyncNotification()).called(1);
  });

  test('marks item failed when image file does not exist', () async {
    when(mockQueue.getPending()).thenAnswer((_) async => [item]);
    when(mockQueue.updateItem(any)).thenAnswer((_) async {});

    await service.syncPending();

    final captured = verify(mockQueue.updateItem(captureAny)).captured.last
        as PendingUpload;
    expect(captured.status, equals(PendingUploadStatus.failed));
    expect(captured.lastError, contains('Archivo no encontrado'));
  });

  group('upload succeeds', () {
    late Directory tempDir;
    late File tempFile;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('zarza_sync_test_');
      tempFile = File('${tempDir.path}/test.jpg');
      await tempFile.writeAsBytes([0xFF, 0xD8, 0xFF]);

      when(mockQueue.resetSyncing()).thenAnswer((_) async {});
      when(mockQueue.updateItem(any)).thenAnswer((_) async {});
      when(mockQueue.countPending()).thenAnswer((_) async => 0);
      when(mockNotif.dismissSyncNotification()).thenAnswer((_) async {});
      when(mockNotif.showQueuedNotification(any)).thenAnswer((_) async {});
      when(mockNotif.updateSyncProgress(any, any)).thenAnswer((_) async {});
    });

    tearDown(() async {
      if (await tempDir.exists()) await tempDir.delete(recursive: true);
    });

    test('deletes item from queue after successful upload', () async {
      final testItem = PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: tempFile.path,
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: PendingUploadStatus.pending,
      );

      when(mockQueue.getPending()).thenAnswer((_) async => [testItem]);
      when(mockRemote.uploadImage(any, any)).thenAnswer((_) async =>
          const UploadResponseModel(
            imageId: 'img-1',
            storageKey: 'key-1',
            status: 'UPLOADED',
          ));

      await service.syncPending();

      verify(mockQueue.delete('sync-1')).called(1);
    });

    test('updates sync progress notifications', () async {
      final testItem = PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: tempFile.path,
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: PendingUploadStatus.pending,
      );

      when(mockQueue.getPending()).thenAnswer((_) async => [testItem]);
      when(mockRemote.uploadImage(any, any)).thenAnswer((_) async =>
          const UploadResponseModel(
            imageId: 'img-1',
            storageKey: 'key-1',
            status: 'UPLOADED',
          ));

      await service.syncPending();

      verify(mockNotif.updateSyncProgress(1, 1)).called(1);
    });
  });

  group('upload fails and retries', () {
    late Directory tempDir;
    late File tempFile;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('zarza_sync_test_');
      tempFile = File('${tempDir.path}/test.jpg');
      await tempFile.writeAsBytes([0xFF, 0xD8, 0xFF]);

      when(mockQueue.resetSyncing()).thenAnswer((_) async {});
      when(mockQueue.updateItem(any)).thenAnswer((_) async {});
      when(mockQueue.countPending()).thenAnswer((_) async => 1);
      when(mockNotif.dismissSyncNotification()).thenAnswer((_) async {});
      when(mockNotif.showQueuedNotification(any)).thenAnswer((_) async {});
      when(mockNotif.updateSyncProgress(any, any)).thenAnswer((_) async {});
      when(mockNotif.showFailedNotification(any)).thenAnswer((_) async {});
    });

    tearDown(() async {
      if (await tempDir.exists()) await tempDir.delete(recursive: true);
    });

    test('increments retryCount on DioException', () async {
      final testItem = PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: tempFile.path,
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: PendingUploadStatus.pending,
        retryCount: 0,
      );

      when(mockQueue.getPending()).thenAnswer((_) async => [testItem]);
      when(mockRemote.uploadImage(any, any))
          .thenThrow(DioException(requestOptions: RequestOptions(path: '/')));

      await service.syncPending();

      final captured = verify(mockQueue.updateItem(captureAny)).captured.last
          as PendingUpload;
      expect(captured.retryCount, equals(1));
      expect(captured.status, equals(PendingUploadStatus.pending));
    });

    test('marks as failed after 3 retry attempts', () async {
      final testItem = PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: tempFile.path,
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: PendingUploadStatus.pending,
        retryCount: 2, // third attempt
      );

      when(mockQueue.getPending()).thenAnswer((_) async => [testItem]);
      when(mockRemote.uploadImage(any, any))
          .thenThrow(DioException(requestOptions: RequestOptions(path: '/')));

      await service.syncPending();

      final captured = verify(mockQueue.updateItem(captureAny)).captured.last
          as PendingUpload;
      expect(captured.status, equals(PendingUploadStatus.failed));
      expect(captured.retryCount, equals(3));
    });

    test('deletes item silently on 409 conflict (deduplication)', () async {
      final testItem = PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: tempFile.path,
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: PendingUploadStatus.pending,
      );

      when(mockQueue.getPending()).thenAnswer((_) async => [testItem]);
      when(mockRemote.uploadImage(any, any)).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: '/'),
          response: Response(requestOptions: RequestOptions(path: '/'), statusCode: 409),
        ),
      );

      await service.syncPending();

      verify(mockQueue.delete('sync-1')).called(1);
    });

  });
}
