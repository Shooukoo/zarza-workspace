import 'package:equatable/equatable.dart';

// ── Events ────────────────────────────────────────────────────────────────────

abstract class AuthFormEvent extends Equatable {
  const AuthFormEvent();
  @override
  List<Object?> get props => [];
}

class AuthLoginSubmitted extends AuthFormEvent {
  const AuthLoginSubmitted({required this.email, required this.password});
  final String email;
  final String password;
  @override
  List<Object?> get props => [email, password];
}

class AuthRegisterSubmitted extends AuthFormEvent {
  const AuthRegisterSubmitted({required this.email, required this.password});
  final String email;
  final String password;
  @override
  List<Object?> get props => [email, password];
}

// ── States ────────────────────────────────────────────────────────────────────

abstract class AuthFormState extends Equatable {
  const AuthFormState();
  @override
  List<Object?> get props => [];
}

class AuthFormInitial extends AuthFormState {
  const AuthFormInitial();
}

class AuthFormLoading extends AuthFormState {
  const AuthFormLoading();
}

class AuthFormSuccess extends AuthFormState {
  const AuthFormSuccess();
}

class AuthFormError extends AuthFormState {
  const AuthFormError(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}
