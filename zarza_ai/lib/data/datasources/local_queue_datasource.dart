import 'dart:io';

import 'package:drift/drift.dart';
import '../../domain/entities/pending_upload.dart' as domain;
import 'app_database.dart';

class LocalQueueDatasource {
  LocalQueueDatasource(this._db);
  final AppDatabase _db;

  Future<void> enqueue(domain.PendingUpload item) async {
    await _db.into(_db.pendingUploads).insertOnConflictUpdate(
          PendingUploadsCompanion.insert(
            offlineSyncId: item.offlineSyncId,
            imagePath: item.imagePath,
            campoId: item.campoId,
            gpsLat: Value(item.gpsLat),
            gpsLon: Value(item.gpsLon),
            capturedAt: item.capturedAt,
            queuedAt: item.queuedAt,
            statusIndex: Value(item.status.index),
            retryCount: Value(item.retryCount),
            lastError: Value(item.lastError),
          ),
        );
  }

  Future<List<domain.PendingUpload>> getPending() async {
    final rows = await (_db.select(_db.pendingUploads)
          ..where((t) =>
              t.statusIndex.equals(domain.PendingUploadStatus.pending.index) |
              t.statusIndex.equals(domain.PendingUploadStatus.syncing.index)))
        .get();
    return rows.map(_toDomain).toList();
  }

  Future<void> updateItem(domain.PendingUpload item) async {
    await (_db.update(_db.pendingUploads)
          ..where((t) => t.offlineSyncId.equals(item.offlineSyncId)))
        .write(PendingUploadsCompanion(
          statusIndex: Value(item.status.index),
          retryCount: Value(item.retryCount),
          lastError: Value(item.lastError),
        ));
  }

  Future<void> delete(String offlineSyncId) async {
    final row = await (_db.select(_db.pendingUploads)
          ..where((t) => t.offlineSyncId.equals(offlineSyncId)))
        .getSingleOrNull();

    if (row != null) {
      final imageFile = File(row.imagePath);
      if (imageFile.existsSync()) imageFile.deleteSync();
    }

    await (_db.delete(_db.pendingUploads)
          ..where((t) => t.offlineSyncId.equals(offlineSyncId)))
        .go();
  }

  Stream<List<domain.PendingUpload>> watchAll() {
    return (_db.select(_db.pendingUploads)).watch().map(
          (rows) => rows.map(_toDomain).toList(),
        );
  }

  Future<int> countPending() async {
    final count = _db.pendingUploads.offlineSyncId.count();
    final query = _db.selectOnly(_db.pendingUploads)
      ..where(_db.pendingUploads.statusIndex
          .equals(domain.PendingUploadStatus.pending.index))
      ..addColumns([count]);
    final row = await query.getSingle();
    return row.read(count) ?? 0;
  }

  Future<void> resetSyncing() async {
    await (_db.update(_db.pendingUploads)
          ..where((t) =>
              t.statusIndex.equals(domain.PendingUploadStatus.syncing.index)))
        .write(PendingUploadsCompanion(
          statusIndex: Value(domain.PendingUploadStatus.pending.index),
        ));
  }

  domain.PendingUpload _toDomain(PendingUpload row) => domain.PendingUpload(
        offlineSyncId: row.offlineSyncId,
        imagePath: row.imagePath,
        campoId: row.campoId,
        capturedAt: row.capturedAt,
        queuedAt: row.queuedAt,
        status: domain.PendingUploadStatus.values[row.statusIndex],
        gpsLat: row.gpsLat,
        gpsLon: row.gpsLon,
        retryCount: row.retryCount,
        lastError: row.lastError,
      );
}
