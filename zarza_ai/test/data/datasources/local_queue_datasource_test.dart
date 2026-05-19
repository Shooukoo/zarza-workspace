import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/data/datasources/app_database.dart';
import 'package:zarza_ai/data/datasources/local_queue_datasource.dart';
import 'package:zarza_ai/domain/entities/pending_upload.dart' as domain;

void main() {
  late AppDatabase db;
  late LocalQueueDatasource datasource;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    datasource = LocalQueueDatasource(db);
  });

  tearDown(() => db.close());

  group('enqueue', () {
    test('inserts item into pending_uploads table', () async {
      final item = domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path/image.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
      );

      await datasource.enqueue(item);

      final rows = await db.select(db.pendingUploads).get();
      expect(rows.length, equals(1));
      expect(rows[0].offlineSyncId, equals('sync-1'));
      expect(rows[0].statusIndex, equals(0)); // pending
    });

    test('upserts on conflict (same offlineSyncId)', () async {
      final item1 = domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path1.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
      );
      final item2 = domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path2.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.syncing,
      );

      await datasource.enqueue(item1);
      await datasource.enqueue(item2);

      final rows = await db.select(db.pendingUploads).get();
      expect(rows.length, equals(1)); // not 2
      expect(rows[0].imagePath, equals('/path2.jpg')); // updated
      expect(rows[0].statusIndex, equals(1)); // syncing
    });

    test('stores optional GPS coordinates and error message', () async {
      final item = domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path/image.jpg',
        campoId: 'campo-1',
        gpsLat: 10.5,
        gpsLon: 20.3,
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.failed,
        lastError: 'Network timeout',
      );

      await datasource.enqueue(item);

      final rows = await db.select(db.pendingUploads).get();
      expect(rows[0].gpsLat, equals(10.5));
      expect(rows[0].gpsLon, equals(20.3));
      expect(rows[0].lastError, equals('Network timeout'));
    });
  });

  group('getPending', () {
    test('returns only pending and syncing items', () async {
      final pending = domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path1.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
      );
      final syncing = domain.PendingUpload(
        offlineSyncId: 'sync-2',
        imagePath: '/path2.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.syncing,
      );
      final failed = domain.PendingUpload(
        offlineSyncId: 'sync-3',
        imagePath: '/path3.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.failed,
      );

      await datasource.enqueue(pending);
      await datasource.enqueue(syncing);
      await datasource.enqueue(failed);

      final result = await datasource.getPending();

      expect(result.length, equals(2));
      expect(
        result.map((r) => r.offlineSyncId),
        containsAll(['sync-1', 'sync-2']),
      );
      expect(
        result.map((r) => r.offlineSyncId),
        isNot(contains('sync-3')),
      );
    });

    test('returns empty list when no pending items', () async {
      final result = await datasource.getPending();
      expect(result, isEmpty);
    });
  });

  group('updateItem', () {
    test('updates status, retry count, and error message', () async {
      final item = domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path/image.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
        retryCount: 0,
      );
      await datasource.enqueue(item);

      final updated = item.copyWith(
        status: domain.PendingUploadStatus.syncing,
        retryCount: 1,
        lastError: 'Connection failed',
      );
      await datasource.updateItem(updated);

      final rows = await db.select(db.pendingUploads).get();
      expect(rows[0].statusIndex, equals(1)); // syncing
      expect(rows[0].retryCount, equals(1));
      expect(rows[0].lastError, equals('Connection failed'));
    });

    test('does not update immutable fields', () async {
      final item = domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path/image.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
      );
      await datasource.enqueue(item);

      final updated = item.copyWith(
        status: domain.PendingUploadStatus.failed,
      );
      await datasource.updateItem(updated);

      final rows = await db.select(db.pendingUploads).get();
      expect(rows[0].imagePath, equals('/path/image.jpg')); // unchanged
      expect(rows[0].statusIndex, equals(2)); // failed (updated field)
    });
  });

  group('delete', () {
    test('deletes item by offlineSyncId', () async {
      final item = domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path/image.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
      );
      await datasource.enqueue(item);

      await datasource.delete('sync-1');

      final rows = await db.select(db.pendingUploads).get();
      expect(rows, isEmpty);
    });

    test('does nothing if item does not exist', () async {
      await datasource.delete('nonexistent');
      final rows = await db.select(db.pendingUploads).get();
      expect(rows, isEmpty);
    });
  });

  group('countPending', () {
    test('counts only items with status pending (statusIndex=0)', () async {
      await datasource.enqueue(domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path1.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
      ));
      await datasource.enqueue(domain.PendingUpload(
        offlineSyncId: 'sync-2',
        imagePath: '/path2.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
      ));
      await datasource.enqueue(domain.PendingUpload(
        offlineSyncId: 'sync-3',
        imagePath: '/path3.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.syncing,
      ));
      await datasource.enqueue(domain.PendingUpload(
        offlineSyncId: 'sync-4',
        imagePath: '/path4.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.failed,
      ));

      final count = await datasource.countPending();

      expect(count, equals(2)); // only sync-1 and sync-2
    });

    test('returns 0 when no pending items', () async {
      final count = await datasource.countPending();
      expect(count, equals(0));
    });
  });

  group('resetSyncing', () {
    test('changes statusIndex from 1 (syncing) to 0 (pending)', () async {
      await datasource.enqueue(domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path1.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.syncing,
      ));
      await datasource.enqueue(domain.PendingUpload(
        offlineSyncId: 'sync-2',
        imagePath: '/path2.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
      ));
      await datasource.enqueue(domain.PendingUpload(
        offlineSyncId: 'sync-3',
        imagePath: '/path3.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.failed,
      ));

      await datasource.resetSyncing();

      final rows = await db.select(db.pendingUploads).get();
      final statuses = {for (var r in rows) r.offlineSyncId: r.statusIndex};
      expect(statuses['sync-1'], equals(0)); // syncing → pending
      expect(statuses['sync-2'], equals(0)); // pending (unchanged)
      expect(statuses['sync-3'], equals(2)); // failed (unchanged)
    });
  });

  group('watchAll', () {
    test('emits initial snapshot and updates on changes', () async {
      final item1 = domain.PendingUpload(
        offlineSyncId: 'sync-1',
        imagePath: '/path1.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026),
        queuedAt: DateTime(2026),
        status: domain.PendingUploadStatus.pending,
      );

      final emissions = <List<domain.PendingUpload>>[];
      final sub = datasource.watchAll().listen((items) {
        emissions.add(items);
      });

      // Initial emission
      await Future.delayed(const Duration(milliseconds: 50));
      expect(emissions.length, equals(1));
      expect(emissions[0], isEmpty);

      // Add item
      await datasource.enqueue(item1);
      await Future.delayed(const Duration(milliseconds: 50));
      expect(emissions.length, equals(2));
      expect(emissions[1].length, equals(1));
      expect(emissions[1][0].offlineSyncId, equals('sync-1'));

      // Update item
      final updated = item1.copyWith(status: domain.PendingUploadStatus.syncing);
      await datasource.updateItem(updated);
      await Future.delayed(const Duration(milliseconds: 50));
      expect(emissions.length, equals(3));
      expect(emissions[2][0].status, equals(domain.PendingUploadStatus.syncing));

      // Delete item
      await datasource.delete('sync-1');
      await Future.delayed(const Duration(milliseconds: 50));
      expect(emissions.length, equals(4));
      expect(emissions[3], isEmpty);

      await sub.cancel();
    });
  });
}
