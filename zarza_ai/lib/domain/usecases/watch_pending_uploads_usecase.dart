import '../entities/pending_upload.dart';
import '../repositories/i_offline_queue_repository.dart';

class WatchPendingUploadsUseCase {
  const WatchPendingUploadsUseCase(this._queue);
  final IOfflineQueueRepository _queue;

  Stream<List<PendingUpload>> call() => _queue.watchAll();
}
