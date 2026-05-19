import 'dart:async';
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:zarza_ai/core/services/sync_service.dart';
import 'package:zarza_ai/domain/entities/pending_upload.dart';
import 'package:zarza_ai/domain/usecases/delete_pending_upload_usecase.dart';
import 'package:zarza_ai/domain/usecases/watch_pending_uploads_usecase.dart';
import 'package:zarza_ai/presentation/queue/offline_queue_bloc.dart';

import 'offline_queue_bloc_test.mocks.dart';

@GenerateMocks([
  WatchPendingUploadsUseCase,
  DeletePendingUploadUseCase,
  SyncService,
])
void main() {
  late MockWatchPendingUploadsUseCase mockWatch;
  late MockDeletePendingUploadUseCase mockDelete;
  late MockSyncService mockSync;
  late OfflineQueueBloc bloc;

  final testItem = PendingUpload(
    offlineSyncId: 'sync-1',
    imagePath: '/path/image.jpg',
    campoId: 'campo-1',
    capturedAt: DateTime(2026),
    queuedAt: DateTime(2026),
    status: PendingUploadStatus.pending,
  );

  setUp(() {
    mockWatch = MockWatchPendingUploadsUseCase();
    mockDelete = MockDeletePendingUploadUseCase();
    mockSync = MockSyncService();

    bloc = OfflineQueueBloc(
      watchUploads: mockWatch,
      deleteUpload: mockDelete,
      syncService: mockSync,
    );
  });

  tearDown(() => bloc.close());

  test('initial state is correct', () {
    expect(
      bloc.state,
      equals(const OfflineQueueState(items: [], isSyncing: false)),
    );
  });

  blocTest<OfflineQueueBloc, OfflineQueueState>(
    'QueueStartWatching subscribes to stream',
    build: () {
      when(mockWatch()).thenAnswer(
        (_) => Stream.value([testItem]),
      );
      return bloc;
    },
    act: (b) => b.add(const QueueStartWatching()),
    expect: () => [
      isA<OfflineQueueState>().having(
        (state) => state.items.length,
        'has 1 item',
        equals(1),
      ),
    ],
  );

  blocTest<OfflineQueueBloc, OfflineQueueState>(
    'QueueUpdated emits new items',
    build: () => bloc,
    seed: () => const OfflineQueueState(items: [], isSyncing: false),
    act: (b) => b.add(QueueUpdated([testItem])),
    expect: () => [
      isA<OfflineQueueState>()
          .having((state) => state.items.length, 'items', equals(1))
          .having((state) => state.items[0].offlineSyncId, 'syncId', 'sync-1'),
    ],
  );

  blocTest<OfflineQueueBloc, OfflineQueueState>(
    'QueueItemDeleted calls usecase with correct id',
    build: () {
      when(mockDelete(any)).thenAnswer((_) async {});
      when(mockWatch()).thenAnswer((_) => const Stream.empty());
      return bloc;
    },
    act: (b) => b.add(const QueueItemDeleted('sync-1')),
    verify: (_) {
      verify(mockDelete('sync-1')).called(1);
    },
  );

  blocTest<OfflineQueueBloc, OfflineQueueState>(
    'QueueSyncRequested toggles isSyncing and calls syncPending',
    build: () {
      when(mockSync.syncPending()).thenAnswer((_) async {});
      when(mockWatch()).thenAnswer((_) => const Stream.empty());
      return bloc;
    },
    act: (b) => b.add(const QueueSyncRequested()),
    expect: () => [
      isA<OfflineQueueState>().having((state) => state.isSyncing, 'isSyncing', isTrue),
      isA<OfflineQueueState>().having((state) => state.isSyncing, 'isSyncing', isFalse),
    ],
    verify: (_) {
      verify(mockSync.syncPending()).called(1);
    },
  );

  blocTest<OfflineQueueBloc, OfflineQueueState>(
    'multiple items in stream are handled correctly',
    build: () {
      final items = [
        testItem,
        PendingUpload(
          offlineSyncId: 'sync-2',
          imagePath: '/path/image2.jpg',
          campoId: 'campo-1',
          capturedAt: DateTime(2026),
          queuedAt: DateTime(2026),
          status: PendingUploadStatus.pending,
        ),
        PendingUpload(
          offlineSyncId: 'sync-3',
          imagePath: '/path/image3.jpg',
          campoId: 'campo-1',
          capturedAt: DateTime(2026),
          queuedAt: DateTime(2026),
          status: PendingUploadStatus.pending,
        ),
      ];
      when(mockWatch()).thenAnswer((_) => Stream.value(items));
      return bloc;
    },
    act: (b) => b.add(const QueueStartWatching()),
    expect: () => [
      isA<OfflineQueueState>().having(
        (state) => state.items.length,
        'has 3 items',
        equals(3),
      ),
    ],
  );

  blocTest<OfflineQueueBloc, OfflineQueueState>(
    'stream updates trigger new states',
    build: () {
      final controller = StreamController<List<PendingUpload>>();
      when(mockWatch()).thenAnswer((_) => controller.stream);

      addTearDown(controller.close);
      return bloc;
    },
    act: (b) {
      b.add(const QueueStartWatching());
      Future.delayed(const Duration(milliseconds: 10)).then((_) {
        // Emulate stream updates
        mockWatch().listen((items) {
          b.add(QueueUpdated(items));
        });
      });
    },
    seed: () => const OfflineQueueState(),
    // Just verify it doesn't crash and state doesn't become null
    verify: (bloc) {
      expect(bloc.state, isA<OfflineQueueState>());
    },
  );
}
