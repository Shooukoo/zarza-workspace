import '../entities/admin_user_entity.dart';
import '../enums/user_role.dart';
import '../repositories/i_admin_repository.dart';

class UpdateUserRoleUseCase {
  const UpdateUserRoleUseCase(this._repository);
  final IAdminRepository _repository;

  Future<AdminUserEntity> call({
    required String userId,
    required UserRole role,
  }) =>
      _repository.updateUserRole(userId: userId, role: role);
}
