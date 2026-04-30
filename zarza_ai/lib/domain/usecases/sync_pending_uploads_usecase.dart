import '../repositories/i_offline_queue_repository.dart';

class SyncPendingUploadsUseCase {
  const SyncPendingUploadsUseCase(this._queue);
  final IOfflineQueueRepository _queue;

  Future<void> call() => _queue.resetSyncing();
}
