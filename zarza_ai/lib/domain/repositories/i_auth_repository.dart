import '../entities/auth_result_entity.dart';
import '../entities/user_entity.dart';

abstract class IAuthRepository {
  Future<AuthResultEntity> login({
    required String email,
    required String password,
  });

  Future<AuthResultEntity> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  });

  Future<void> logout();

  Future<String?> getStoredToken();

  Future<UserEntity?> getStoredUser();

  /// Actualiza el nombre del usuario en el backend y en el almacenamiento local.
  /// Retorna el [UserEntity] actualizado.
  Future<UserEntity> updateProfile({
    String? firstName,
    String? lastName,
  });
}
