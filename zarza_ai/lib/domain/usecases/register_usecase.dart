import '../entities/auth_result_entity.dart';
import '../repositories/i_auth_repository.dart';

class RegisterUseCase {
  const RegisterUseCase(this._repository);
  final IAuthRepository _repository;

  Future<AuthResultEntity> call({
    required String email,
    required String password,
  }) {
    return _repository.register(email: email, password: password);
  }
}
