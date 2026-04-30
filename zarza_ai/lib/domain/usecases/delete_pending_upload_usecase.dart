import '../repositories/i_offline_queue_repository.dart';

class DeletePendingUploadUseCase {
  const DeletePendingUploadUseCase(this._queue);
  final IOfflineQueueRepository _queue;

  Future<void> call(String offlineSyncId) => _queue.delete(offlineSyncId);
}
