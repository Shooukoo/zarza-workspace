import '../../domain/entities/auth_result_entity.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/i_auth_repository.dart';
import '../datasources/local_auth_datasource.dart';
import '../datasources/remote_auth_datasource.dart';

class AuthRepositoryImpl implements IAuthRepository {
  AuthRepositoryImpl({
    required RemoteAuthDatasource remote,
    required LocalAuthDatasource local,
  })  : _remote = remote,
        _local = local;

  final RemoteAuthDatasource _remote;
  final LocalAuthDatasource _local;

  @override
  Future<AuthResultEntity> login({
    required String email,
    required String password,
  }) async {
    final model = await _remote.login(email: email, password: password);

    // Después del login el servidor no devuelve `user`, pero necesitamos
    // un UserEntity mínimo para continuar; usaremos el del modelo (fallback).
    final entity = model.toEntity();
    await _local.saveToken(entity.token);
    await _local.saveUser(entity.user);
    return entity;
  }

  @override
  Future<AuthResultEntity> register({
    required String email,
    required String password,
  }) async {
    final model = await _remote.register(email: email, password: password);
    final entity = model.toEntity();
    await _local.saveToken(entity.token);
    await _local.saveUser(entity.user);
    return entity;
  }

  @override
  Future<void> logout() => _local.clearAll();

  @override
  Future<String?> getStoredToken() => _local.getToken();

  @override
  Future<UserEntity?> getStoredUser() => _local.getUser();
}
