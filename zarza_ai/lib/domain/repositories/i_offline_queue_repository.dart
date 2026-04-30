import '../entities/pending_upload.dart';

abstract class IOfflineQueueRepository {
  Future<void> enqueue(PendingUpload item);
  Future<List<PendingUpload>> getPending();
  Future<void> updateItem(PendingUpload item);
  Future<void> delete(String offlineSyncId);
  Stream<List<PendingUpload>> watchAll();
  Future<int> countPending();
  Future<void> resetSyncing();
}
