import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:zarza_ai/core/services/local_notifications_service.dart';
import 'package:zarza_ai/core/services/sync_service.dart';
import 'package:zarza_ai/data/datasources/remote_ingestion_datasource.dart';
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
}
