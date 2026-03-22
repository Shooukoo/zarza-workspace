import 'package:equatable/equatable.dart';

import '../../domain/enums/user_role.dart';

class AdminUserEntity extends Equatable {
  const AdminUserEntity({
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

  @override
  List<Object?> get props => [id, email, role, createdAt, totalAnalyses];
}
