import 'package:equatable/equatable.dart';

import '../../domain/enums/user_role.dart';

class AdminStatsEntity extends Equatable {
  const AdminStatsEntity({
    required this.totalUsers,
    required this.usersByRole,
  });

  final int totalUsers;
  final Map<UserRole, int> usersByRole;

  @override
  List<Object?> get props => [totalUsers, usersByRole];
}
