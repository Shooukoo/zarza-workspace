import 'package:equatable/equatable.dart';

import '../enums/user_role.dart';

class UserEntity extends Equatable {
  const UserEntity({
    required this.id,
    required this.email,
    required this.role,
  });

  final String id;
  final String email;
  final UserRole role;

  @override
  List<Object?> get props => [id, email, role];
}
