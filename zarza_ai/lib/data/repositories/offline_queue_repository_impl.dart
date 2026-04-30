import '../../domain/entities/pending_upload.dart';
import '../../domain/repositories/i_offline_queue_repository.dart';
import '../datasources/local_queue_datasource.dart';

class OfflineQueueRepositoryImpl implements IOfflineQueueRepository {
  OfflineQueueRepositoryImpl(this._datasource);
  final LocalQueueDatasource _datasource;

  @override
  Future<void> enqueue(PendingUpload item) => _datasource.enqueue(item);

  @override
  Future<List<PendingUpload>> getPending() => _datasource.getPending();

  @override
  Future<void> updateItem(PendingUpload item) => _datasource.updateItem(item);

  @override
  Future<void> delete(String offlineSyncId) => _datasource.delete(offlineSyncId);

  @override
  Stream<List<PendingUpload>> watchAll() => _datasource.watchAll();

  @override
  Future<int> countPending() => _datasource.countPending();

  @override
  Future<void> resetSyncing() => _datasource.resetSyncing();
}
