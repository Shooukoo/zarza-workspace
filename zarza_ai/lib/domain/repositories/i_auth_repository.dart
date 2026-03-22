import '../entities/auth_result_entity.dart';
import '../entities/user_entity.dart';

/// Contrato de autenticación que debe implementar la capa de datos.
abstract class IAuthRepository {
  /// Inicia sesión con [email] y [password]. Retorna [AuthResultEntity] con
  /// el JWT y el usuario autenticado.
  Future<AuthResultEntity> login({
    required String email,
    required String password,
  });

  /// Registra un nuevo usuario. El rol asignado siempre es `MONITOR`
  /// (decisión del servidor, nunca del cliente).
  Future<AuthResultEntity> register({
    required String email,
    required String password,
  });

  /// Elimina el token y los datos de sesión del almacenamiento local.
  Future<void> logout();

  /// Recupera el token JWT almacenado localmente. Retorna `null` si no hay
  /// sesión activa.
  Future<String?> getStoredToken();

  /// Recupera el usuario almacenado localmente. Retorna `null` si no hay
  /// sesión activa.
  Future<UserEntity?> getStoredUser();
}
