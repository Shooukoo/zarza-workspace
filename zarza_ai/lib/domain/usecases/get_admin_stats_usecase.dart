import '../entities/admin_stats_entity.dart';
import '../repositories/i_admin_repository.dart';

class GetAdminStatsUseCase {
  const GetAdminStatsUseCase(this._repository);
  final IAdminRepository _repository;

  Future<AdminStatsEntity> call() => _repository.getStats();
}
