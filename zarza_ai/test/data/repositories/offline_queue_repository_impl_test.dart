import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:zarza_ai/data/datasources/local_queue_datasource.dart';
import 'package:zarza_ai/data/repositories/offline_queue_repository_impl.dart';
import 'package:zarza_ai/domain/entities/pending_upload.dart';

import 'offline_queue_repository_impl_test.mocks.dart';

@GenerateMocks([LocalQueueDatasource])
void main() {
  late MockLocalQueueDatasource mockDatasource;
  late OfflineQueueRepositoryImpl repo;

  setUp(() {
    mockDatasource = MockLocalQueueDatasource();
    repo = OfflineQueueRepositoryImpl(mockDatasource);
  });

  final item = PendingUpload(
    offlineSyncId: 'sync-1',
    imagePath: '/path/image.jpg',
    campoId: 'campo-1',
    capturedAt: DateTime(2026),
    queuedAt: DateTime(2026),
    status: PendingUploadStatus.pending,
  );

  test('enqueue delegates to datasource', () async {
    when(mockDatasource.enqueue(item)).thenAnswer((_) async {});
    await repo.enqueue(item);
    verify(mockDatasource.enqueue(item)).called(1);
  });

  test('delete delegates to datasource', () async {
    when(mockDatasource.delete('sync-1')).thenAnswer((_) async {});
    await repo.delete('sync-1');
    verify(mockDatasource.delete('sync-1')).called(1);
  });

  test('getPending delegates to datasource', () async {
    when(mockDatasource.getPending()).thenAnswer((_) async => [item]);
    final result = await repo.getPending();
    expect(result, equals([item]));
    verify(mockDatasource.getPending()).called(1);
  });

  test('updateItem delegates to datasource', () async {
    when(mockDatasource.updateItem(item)).thenAnswer((_) async {});
    await repo.updateItem(item);
    verify(mockDatasource.updateItem(item)).called(1);
  });

  test('countPending delegates to datasource', () async {
    when(mockDatasource.countPending()).thenAnswer((_) async => 3);
    final result = await repo.countPending();
    expect(result, equals(3));
    verify(mockDatasource.countPending()).called(1);
  });

  test('resetSyncing delegates to datasource', () async {
    when(mockDatasource.resetSyncing()).thenAnswer((_) async {});
    await repo.resetSyncing();
    verify(mockDatasource.resetSyncing()).called(1);
  });

  test('watchAll returns stream from datasource', () async {
    final stream = Stream<List<PendingUpload>>.fromIterable([
      [item],
      [],
    ]);
    when(mockDatasource.watchAll()).thenAnswer((_) => stream);
    final result = repo.watchAll();
    expect(result, emits([item]));
  });
}
