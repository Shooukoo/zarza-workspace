import '../entities/user_entity.dart';
import '../repositories/i_auth_repository.dart';

class UpdateProfileUseCase {
  const UpdateProfileUseCase(this._repository);
  final IAuthRepository _repository;

  Future<UserEntity> call({
    String? firstName,
    String? lastName,
  }) {
    return _repository.updateProfile(
      firstName: firstName,
      lastName: lastName,
    );
  }
}
