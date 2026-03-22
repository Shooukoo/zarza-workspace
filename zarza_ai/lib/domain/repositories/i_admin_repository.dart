import '../entities/admin_user_entity.dart';
import '../entities/admin_stats_entity.dart';
import '../entities/admin_dashboard_entity.dart';
import '../enums/user_role.dart';

abstract class IAdminRepository {
  Future<({List<AdminUserEntity> data, int total, int page, int limit})>
      getUsers({int page = 1, int limit = 20});

  Future<AdminUserEntity> updateUserRole({
    required String userId,
    required UserRole role,
  });

  Future<AdminStatsEntity> getStats();

  Future<AdminUserEntity> createUser({
    required String email,
    required String password,
    required UserRole role,
  });

  Future<List<YieldForecastEntity>> getDashboardYield();

  Future<HealthMetricsEntity> getDashboardHealth();

  Future<List<PhenologyDistributionEntity>> getDashboardPhenology();
}
