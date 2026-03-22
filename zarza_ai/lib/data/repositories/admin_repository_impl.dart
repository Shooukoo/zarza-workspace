import '../../domain/entities/admin_user_entity.dart';
import '../../domain/entities/admin_stats_entity.dart';
import '../../domain/entities/admin_dashboard_entity.dart';
import '../../domain/enums/user_role.dart';
import '../../domain/repositories/i_admin_repository.dart';
import '../datasources/remote_admin_datasource.dart';

class AdminRepositoryImpl implements IAdminRepository {
  AdminRepositoryImpl(this._remote);
  final RemoteAdminDatasource _remote;

  @override
  Future<({List<AdminUserEntity> data, int total, int page, int limit})>
      getUsers({int page = 1, int limit = 20}) async {
    final model = await _remote.getUsers(page: page, limit: limit);
    return (
      data: model.data.map((m) => m.toEntity()).toList(),
      total: model.total,
      page: model.page,
      limit: model.limit,
    );
  }

  @override
  Future<AdminUserEntity> updateUserRole({
    required String userId,
    required UserRole role,
  }) async {
    final model = await _remote.updateUserRole(userId: userId, role: role);
    return model.toEntity();
  }

  @override
  Future<AdminStatsEntity> getStats() async {
    final model = await _remote.getStats();
    return model.toEntity();
  }

  @override
  Future<AdminUserEntity> createUser({
    required String email,
    required String password,
    required UserRole role,
  }) async {
    final model = await _remote.createUser(
      email: email,
      password: password,
      role: role,
    );
    return model.toEntity();
  }

  @override
  Future<List<YieldForecastEntity>> getDashboardYield() async {
    final dtos = await _remote.getDashboardYield();
    return dtos.map((dto) => dto.toEntity()).toList();
  }

  @override
  Future<HealthMetricsEntity> getDashboardHealth() async {
    final dto = await _remote.getDashboardHealth();
    return dto.toEntity();
  }

  @override
  Future<List<PhenologyDistributionEntity>> getDashboardPhenology() async {
    final dtos = await _remote.getDashboardPhenology();
    return dtos.map((dto) => dto.toEntity()).toList();
  }
}
