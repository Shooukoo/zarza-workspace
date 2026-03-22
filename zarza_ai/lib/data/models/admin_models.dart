import '../../domain/entities/admin_user_entity.dart';
import '../../domain/entities/admin_stats_entity.dart';
import '../../domain/enums/user_role.dart';

class AdminUserModel {
  const AdminUserModel._({
    required this.id,
    required this.email,
    required this.role,
    required this.createdAt,
    this.totalAnalyses,
  });

  final String id;
  final String email;
  final UserRole role;
  final DateTime createdAt;
  final int? totalAnalyses;

  factory AdminUserModel.fromJson(Map<String, dynamic> json) {
    return AdminUserModel._(
      id: json['id'] as String,
      email: json['email'] as String,
      role: UserRole.fromString(json['role'] as String? ?? 'MONITOR'),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      totalAnalyses: json['totalAnalyses'] as int?,
    );
  }

  AdminUserEntity toEntity() => AdminUserEntity(
        id: id,
        email: email,
        role: role,
        createdAt: createdAt,
        totalAnalyses: totalAnalyses,
      );
}

class AdminUsersPageModel {
  const AdminUsersPageModel({
    required this.data,
    required this.total,
    required this.page,
    required this.limit,
  });

  final List<AdminUserModel> data;
  final int total;
  final int page;
  final int limit;

  factory AdminUsersPageModel.fromJson(Map<String, dynamic> json) {
    return AdminUsersPageModel(
      data: (json['data'] as List<dynamic>)
          .map((e) => AdminUserModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      page: json['page'] as int,
      limit: json['limit'] as int,
    );
  }
}

class AdminStatsModel {
  const AdminStatsModel._({
    required this.totalUsers,
    required this.usersByRole,
  });

  final int totalUsers;
  final Map<UserRole, int> usersByRole;

  factory AdminStatsModel.fromJson(Map<String, dynamic> json) {
    final rawByRole = json['usersByRole'] as Map<String, dynamic>? ?? {};
    final usersByRole = <UserRole, int>{};
    for (final entry in rawByRole.entries) {
      final role = UserRole.fromString(entry.key);
      usersByRole[role] = (entry.value as num).toInt();
    }
    return AdminStatsModel._(
      totalUsers: (json['totalUsers'] as num).toInt(),
      usersByRole: usersByRole,
    );
  }

  AdminStatsEntity toEntity() => AdminStatsEntity(
        totalUsers: totalUsers,
        usersByRole: usersByRole,
      );
}
