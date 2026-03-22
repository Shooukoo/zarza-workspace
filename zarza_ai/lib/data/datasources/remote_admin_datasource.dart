import 'package:dio/dio.dart';

import '../../core/constants/app_constants.dart';
import '../../domain/enums/user_role.dart';
import '../models/admin_models.dart';
import '../models/admin_dashboard_models.dart';

/// Datasource remoto para los endpoints de administración.
/// El token JWT se inyecta automáticamente por [AuthInterceptor].
class RemoteAdminDatasource {
  RemoteAdminDatasource(this._dio);
  final Dio _dio;

  Future<AdminUsersPageModel> getUsers({int page = 1, int limit = 20}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      AppConstants.adminUsersEndpoint,
      queryParameters: {'page': page, 'limit': limit},
    );
    return AdminUsersPageModel.fromJson(response.data!);
  }

  Future<AdminUserModel> updateUserRole({
    required String userId,
    required UserRole role,
  }) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '${AppConstants.adminUsersEndpoint}/$userId/role',
      data: {'role': role.name.toUpperCase()},
    );
    return AdminUserModel.fromJson(response.data!);
  }

  Future<AdminStatsModel> getStats() async {
    final response = await _dio.get<Map<String, dynamic>>(
      AppConstants.adminStatsEndpoint,
    );
    return AdminStatsModel.fromJson(response.data!);
  }

  Future<AdminUserModel> createUser({
    required String email,
    required String password,
    required UserRole role,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '${AppConstants.adminUsersEndpoint}',
      data: {
        'email': email,
        'password': password,
        'role': role.name.toUpperCase(),
      },
    );
    return AdminUserModel.fromJson(response.data!);
  }

  Future<List<YieldForecastDto>> getDashboardYield() async {
    final response = await _dio.get<List<dynamic>>(
      '/api/admin/dashboard/yield',
    );
    return response.data!
        .map((e) => YieldForecastDto.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<HealthMetricsDto> getDashboardHealth() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/admin/dashboard/health',
    );
    return HealthMetricsDto.fromJson(response.data!);
  }

  Future<List<PhenologyDistributionDto>> getDashboardPhenology() async {
    final response = await _dio.get<List<dynamic>>(
      '/api/admin/dashboard/phenology',
    );
    return response.data!
        .map((e) => PhenologyDistributionDto.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
