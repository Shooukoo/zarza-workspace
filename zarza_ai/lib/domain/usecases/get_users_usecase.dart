import '../entities/admin_user_entity.dart';
import '../repositories/i_admin_repository.dart';

class GetUsersUseCase {
  const GetUsersUseCase(this._repository);
  final IAdminRepository _repository;

  Future<({List<AdminUserEntity> data, int total, int page, int limit})> call({
    int page = 1,
    int limit = 20,
  }) =>
      _repository.getUsers(page: page, limit: limit);
}
