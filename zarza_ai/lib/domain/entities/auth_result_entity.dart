import 'package:equatable/equatable.dart';

import 'user_entity.dart';

class AuthResultEntity extends Equatable {
  const AuthResultEntity({
    required this.token,
    required this.refreshToken,
    required this.user,
  });

  final String token;
  final String? refreshToken;
  final UserEntity user;

  @override
  List<Object?> get props => [token, refreshToken, user];
}
