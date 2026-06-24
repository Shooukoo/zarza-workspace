import 'package:dio/dio.dart';

import '../../domain/entities/auth_result_entity.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/i_auth_repository.dart';
import '../datasources/local_auth_datasource.dart';
import '../datasources/remote_auth_datasource.dart';

class AuthRepositoryImpl implements IAuthRepository {
  AuthRepositoryImpl({
    required RemoteAuthDatasource remote,
    required LocalAuthDatasource local,
    required Dio dio,
  })  : _remote = remote,
        _local = local,
        _dio = dio;

  final RemoteAuthDatasource _remote;
  final LocalAuthDatasource _local;
  final Dio _dio;

  @override
  Future<AuthResultEntity> login({
    required String email,
    required String password,
  }) async {
    final model = await _remote.login(email: email, password: password);
    final entity = model.toEntity();
    await _local.saveToken(entity.token);
    if (entity.refreshToken != null) {
      await _local.saveRefreshToken(entity.refreshToken!);
    }
    await _local.saveUser(entity.user);
    return entity;
  }

  @override
  Future<AuthResultEntity> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    final model = await _remote.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
    );
    final entity = model.toEntity();
    await _local.saveToken(entity.token);
    await _local.saveUser(entity.user);
    return entity;
  }

  @override
  Future<void> logout() async {
    final refreshToken = await _local.getRefreshToken();
    final body = refreshToken != null ? {'refreshToken': refreshToken} : <String, dynamic>{};
    try {
      await _dio.post<void>(
        '/api/v1/auth/logout',
        data: body,
      );
    } on DioException catch (_) {
      // Si la revocación falla (red, 4xx/5xx, timeout), igual limpiamos el storage local
    }
    await _local.clearAll();
  }

  @override
  Future<String?> getStoredToken() => _local.getToken();

  @override
  Future<UserEntity?> getStoredUser() => _local.getUser();

  @override
  Future<UserEntity> updateProfile({
    String? firstName,
    String? lastName,
  }) async {
    await _dio.patch<void>(
      '/api/v1/auth/profile',
      data: {
        'firstName': ?firstName,
        'lastName': ?lastName,
      },
    );
    final stored = await _local.getUser();
    if (stored == null) throw StateError('No authenticated user in local storage');
    final updated = UserEntity(
      id: stored.id,
      email: stored.email,
      role: stored.role,
      firstName: firstName ?? stored.firstName,
      lastName: lastName ?? stored.lastName,
    );
    await _local.saveUser(updated);
    return updated;
  }
}
