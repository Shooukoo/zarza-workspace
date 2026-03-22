import '../entities/admin_user_entity.dart';
import '../enums/user_role.dart';
import '../repositories/i_admin_repository.dart';

class CreateUserUseCase {
  const CreateUserUseCase(this._repository);
  final IAdminRepository _repository;

  Future<AdminUserEntity> call({
    required String email,
    required String password,
    required UserRole role,
  }) {
    return _repository.createUser(
      email: email,
      password: password,
      role: role,
    );
  }
}
