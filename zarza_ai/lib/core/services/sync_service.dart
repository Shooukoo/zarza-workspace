import 'dart:io';
import 'package:dio/dio.dart';
import '../services/local_notifications_service.dart';
import '../../data/datasources/remote_ingestion_datasource.dart';
import '../../domain/entities/pending_upload.dart';
import '../../domain/entities/upload_metadata.dart';
import '../../domain/repositories/i_offline_queue_repository.dart';

class SyncService {
  SyncService({
    required IOfflineQueueRepository queue,
    required RemoteIngestionDatasource remote,
    required LocalNotificationsService notifications,
  })  : _queue = queue,
        _remote = remote,
        _notifications = notifications;

  final IOfflineQueueRepository _queue;
  final RemoteIngestionDatasource _remote;
  final LocalNotificationsService _notifications;

  Future<void> syncPending() async {
    await _queue.resetSyncing();

    final items = await _queue.getPending();
    if (items.isEmpty) {
      await _notifications.dismissSyncNotification();
      return;
    }

    final total = items.length;
    await _notifications.showQueuedNotification(total);

    int done = 0;
    for (final item in items) {
      await _queue.updateItem(item.copyWith(status: PendingUploadStatus.syncing));

      final file = File(item.imagePath);
      if (!file.existsSync()) {
        await _queue.updateItem(item.copyWith(
          status: PendingUploadStatus.failed,
          lastError: 'Archivo no encontrado',
        ));
        done++;
        continue;
      }

      try {
        final metadata = UploadMetadata(
          campoId: item.campoId,
          capturedAt: item.capturedAt,
          offlineSyncId: item.offlineSyncId,
          gpsLat: item.gpsLat,
          gpsLon: item.gpsLon,
        );
        await _remote.uploadImage(file, metadata);
        await _queue.delete(item.offlineSyncId);
        done++;
        await _notifications.updateSyncProgress(done, total);
      } on DioException catch (e) {
        if (e.response?.statusCode == 409) {
          await _queue.delete(item.offlineSyncId);
          done++;
        } else {
          final newRetry = item.retryCount + 1;
          final newStatus =
              newRetry >= 3 ? PendingUploadStatus.failed : PendingUploadStatus.pending;
          await _queue.updateItem(item.copyWith(
            status: newStatus,
            retryCount: newRetry,
            lastError: e.message,
          ));
        }
      } on Object catch (e) {
        final newRetry = item.retryCount + 1;
        final newStatus =
            newRetry >= 3 ? PendingUploadStatus.failed : PendingUploadStatus.pending;
        await _queue.updateItem(item.copyWith(
          status: newStatus,
          retryCount: newRetry,
          lastError: e.toString(),
        ));
      }
    }

    final remaining = await _queue.countPending();
    final allItems = await _queue.getPending();
    final failedCount =
        allItems.where((i) => i.status == PendingUploadStatus.failed).length;

    if (remaining == 0 && failedCount == 0) {
      await _notifications.dismissSyncNotification();
    } else if (failedCount > 0) {
      await _notifications.showFailedNotification(failedCount);
    }
  }
}
