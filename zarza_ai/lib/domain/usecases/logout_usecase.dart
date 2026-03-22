import '../repositories/i_auth_repository.dart';

class LogoutUseCase {
  const LogoutUseCase(this._repository);
  final IAuthRepository _repository;

  Future<void> call() => _repository.logout();
}
