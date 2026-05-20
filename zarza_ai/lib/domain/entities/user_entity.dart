import 'package:equatable/equatable.dart';

import '../enums/user_role.dart';

class UserEntity extends Equatable {
  const UserEntity({
    required this.id,
    required this.email,
    required this.role,
    this.firstName,
    this.lastName,
  });

  final String id;
  final String email;
  final UserRole role;
  final String? firstName;
  final String? lastName;

  /// Nombre a mostrar en saludos: firstName si existe, sino prefijo del email.
  String get displayName => firstName ?? email.split('@').first;

  @override
  List<Object?> get props => [id, email, role, firstName, lastName];
}
