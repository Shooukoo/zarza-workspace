import 'package:equatable/equatable.dart';

import '../../domain/entities/user_entity.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// Estado inicial — aún no se ha verificado si hay sesión persistida.
class AuthInitial extends AuthState {
  const AuthInitial();
}

/// Verificando token almacenado o procesando login/register.
class AuthLoading extends AuthState {
  const AuthLoading();
}

/// Sesión activa con usuario y token válidos.
class AuthAuthenticated extends AuthState {
  const AuthAuthenticated({required this.user, required this.token});

  final UserEntity user;
  final String token;

  @override
  List<Object?> get props => [user, token];
}

/// Sin sesión o sesión expirada.
class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// Error al verificar, hacer login o hacer register.
class AuthError extends AuthState {
  const AuthError(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

/// El admin creó un nuevo usuario exitosamente. La sesión del admin no cambia.
class AdminCreateUserSuccess extends AuthState {
  const AdminCreateUserSuccess(this.createdUserEmail);

  final String createdUserEmail;

  @override
  List<Object?> get props => [createdUserEmail];
}
