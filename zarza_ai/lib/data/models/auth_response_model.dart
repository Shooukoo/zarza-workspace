import '../../domain/entities/auth_result_entity.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';

class AuthResponseModel {
  const AuthResponseModel._({
    required this.token,
    required this.refreshToken,
    required this.user,
  });

  final String token;
  final String refreshToken;
  final UserEntity user;

  factory AuthResponseModel.fromJson(
    Map<String, dynamic> json, {
    UserEntity? fallbackUser,
  }) {
    final userJson = json['user'] as Map<String, dynamic>?;

    final UserEntity user;
    if (userJson != null) {
      user = UserEntity(
        id: userJson['id'] as String? ?? '',
        email: userJson['email'] as String? ?? '',
        role: UserRole.fromString(userJson['role'] as String? ?? 'MONITOR'),
        firstName: userJson['firstName'] as String?,
        lastName: userJson['lastName'] as String?,
      );
    } else if (fallbackUser != null) {
      user = fallbackUser;
    } else {
      user = const UserEntity(id: '', email: '', role: UserRole.monitor);
    }

    return AuthResponseModel._(
      token: json['token'] as String,
      refreshToken: json['refreshToken'] as String? ?? '',
      user: user,
    );
  }

  AuthResultEntity toEntity() => AuthResultEntity(
        token: token,
        refreshToken: refreshToken,
        user: user,
      );
}
