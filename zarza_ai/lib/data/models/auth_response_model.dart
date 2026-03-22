import '../../domain/entities/auth_result_entity.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';

/// DTO que mapea la respuesta JSON del servidor a entidades de dominio.
///
/// Soporta las dos formas de respuesta del backend:
///  - Login  → `{ "token": "..." }`            (sin campo `user`)
///  - Register → `{ "token": "...", "user": { "id", "email", "role" } }`
class AuthResponseModel {
  const AuthResponseModel._({
    required this.token,
    required this.user,
  });

  final String token;
  final UserEntity user;

  factory AuthResponseModel.fromJson(
    Map<String, dynamic> json, {
    /// Si el servidor no devuelve `user` (ej. login) se usa este fallback.
    UserEntity? fallbackUser,
  }) {
    final userJson = json['user'] as Map<String, dynamic>?;

    final UserEntity user;
    if (userJson != null) {
      user = UserEntity(
        id: userJson['id'] as String? ?? '',
        email: userJson['email'] as String? ?? '',
        role: UserRole.fromString(userJson['role'] as String? ?? 'MONITOR'),
      );
    } else if (fallbackUser != null) {
      user = fallbackUser;
    } else {
      // Fallback seguro — no debería ocurrir en producción
      user = const UserEntity(id: '', email: '', role: UserRole.monitor);
    }

    return AuthResponseModel._(
      token: json['token'] as String,
      user: user,
    );
  }

  AuthResultEntity toEntity() => AuthResultEntity(token: token, user: user);
}
