import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../../core/services/connectivity_service.dart';
import '../../core/services/local_notifications_service.dart';
import '../../domain/entities/fruit_analysis.dart';
import '../../domain/entities/pending_upload.dart';
import '../../domain/entities/upload_metadata.dart';
import '../../domain/repositories/i_ingestion_repository.dart';
import '../../domain/repositories/i_offline_queue_repository.dart';
import '../datasources/remote_ingestion_datasource.dart';

/// Resolves the directory used to persist offline images.
/// Defaults to [getApplicationDocumentsDirectory]; injectable for tests.
typedef DirectoryResolver = Future<Directory> Function();

Future<Directory> _defaultDirectoryResolver() =>
    getApplicationDocumentsDirectory();

class OfflineAwareIngestionRepository implements IIngestionRepository {
  OfflineAwareIngestionRepository({
    required RemoteIngestionDatasource remote,
    required IOfflineQueueRepository queue,
    required ConnectivityService connectivity,
    required LocalNotificationsService notifications,
    DirectoryResolver? directoryResolver,
  })  : _remote = remote,
        _queue = queue,
        _connectivity = connectivity,
        _notifications = notifications,
        _directoryResolver =
            directoryResolver ?? _defaultDirectoryResolver;

  final RemoteIngestionDatasource _remote;
  final IOfflineQueueRepository _queue;
  final ConnectivityService _connectivity;
  final LocalNotificationsService _notifications;
  final DirectoryResolver _directoryResolver;

  @override
  Future<UploadResult> uploadImage(File image, UploadMetadata metadata) async {
    if (await _connectivity.isConnected()) {
      final model = await _remote.uploadImage(image, metadata);
      return model.toEntity();
    }

    // Persist the image so it survives app restarts
    final dir = await _directoryResolver();
    final filename = '${metadata.offlineSyncId}.jpg';
    final destPath = '${dir.path}/$filename';

    final String persistedPath;
    if (await image.exists()) {
      final persistentFile = await image.copy(destPath);
      persistedPath = persistentFile.path;
    } else {
      // Image file not accessible (e.g. test environment); keep original path
      persistedPath = image.path;
    }

    final pending = PendingUpload(
      offlineSyncId: metadata.offlineSyncId,
      imagePath: persistedPath,
      campoId: metadata.campoId,
      gpsLat: metadata.gpsLat,
      gpsLon: metadata.gpsLon,
      capturedAt: metadata.capturedAt,
      queuedAt: DateTime.now(),
      status: PendingUploadStatus.pending,
    );

    await _queue.enqueue(pending);
    final count = await _queue.countPending();
    await _notifications.showQueuedNotification(count);

    return UploadResult(
      imageId: metadata.offlineSyncId,
      storageKey: '',
      status: 'QUEUED',
    );
  }
}
