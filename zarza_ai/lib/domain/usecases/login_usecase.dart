import '../entities/auth_result_entity.dart';
import '../repositories/i_auth_repository.dart';

class LoginUseCase {
  const LoginUseCase(this._repository);
  final IAuthRepository _repository;

  Future<AuthResultEntity> call({
    required String email,
    required String password,
  }) {
    return _repository.login(email: email, password: password);
  }
}
