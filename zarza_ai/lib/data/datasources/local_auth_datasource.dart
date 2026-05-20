import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';

class LocalAuthDatasource {
  LocalAuthDatasource(this._storage);
  final FlutterSecureStorage _storage;

  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';

  Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<String?> getToken() => _storage.read(key: _tokenKey);

  Future<void> deleteToken() => _storage.delete(key: _tokenKey);

  Future<void> saveUser(UserEntity user) async {
    final json = jsonEncode({
      'id': user.id,
      'email': user.email,
      'role': user.role.name.toUpperCase(),
      if (user.firstName != null) 'firstName': user.firstName,
      if (user.lastName != null) 'lastName': user.lastName,
    });
    await _storage.write(key: _userKey, value: json);
  }

  Future<UserEntity?> getUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null) return null;
    final map = jsonDecode(raw) as Map<String, dynamic>;
    return UserEntity(
      id: map['id'] as String,
      email: map['email'] as String,
      role: UserRole.fromString(map['role'] as String),
      firstName: map['firstName'] as String?,
      lastName: map['lastName'] as String?,
    );
  }

  Future<void> deleteUser() => _storage.delete(key: _userKey);

  Future<void> clearAll() async {
    await deleteToken();
    await deleteUser();
  }
}
