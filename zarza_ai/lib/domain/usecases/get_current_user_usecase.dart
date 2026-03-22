import '../entities/user_entity.dart';
import '../repositories/i_auth_repository.dart';

/// Recupera el usuario activo de la sesión local persistida.
class GetCurrentUserUseCase {
  const GetCurrentUserUseCase(this._repository);
  final IAuthRepository _repository;

  Future<UserEntity?> call() => _repository.getStoredUser();
}
