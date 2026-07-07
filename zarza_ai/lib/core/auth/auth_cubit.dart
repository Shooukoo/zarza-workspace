import 'dart:async';
import 'dart:developer' as developer;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';

import '../../core/services/fcm_service.dart';
import '../../data/datasources/websocket_datasource.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/register_usecase.dart';
import '../../domain/usecases/update_profile_usecase.dart';
import 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  AuthCubit({
    required LoginUseCase loginUseCase,
    required RegisterUseCase registerUseCase,
    required LogoutUseCase logoutUseCase,
    required GetCurrentUserUseCase getCurrentUserUseCase,
    required UpdateProfileUseCase updateProfileUseCase,
  })  : _login = loginUseCase,
        _register = registerUseCase,
        _logout = logoutUseCase,
        _getCurrentUser = getCurrentUserUseCase,
        _updateProfile = updateProfileUseCase,
        super(const AuthInitial());

  final LoginUseCase _login;
  final RegisterUseCase _register;
  final LogoutUseCase _logout;
  final GetCurrentUserUseCase _getCurrentUser;
  final UpdateProfileUseCase _updateProfile;

  Future<void> checkSession() async {
    emit(const AuthLoading());
    try {
      final user = await _getCurrentUser();
      if (user != null) {
        emit(AuthAuthenticated(user: user, token: ''));
        _reconnectWebSocket();
      } else {
        emit(const AuthUnauthenticated());
      }
    } on Exception catch (_) {
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    emit(const AuthLoading());
    try {
      final result = await _login(email: email, password: password);
      emit(AuthAuthenticated(user: result.user, token: result.token));
      _reconnectWebSocket();
      unawaited(GetIt.I<FcmService>().init().catchError((_) {}));
    } on Exception catch (e, stack) {
      developer.log('[AuthCubit] login error', error: e, stackTrace: stack);
      emit(AuthError(_friendlyMessage(e)));
    }
  }

  Future<void> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    emit(const AuthLoading());
    try {
      final result = await _register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      );
      emit(AuthAuthenticated(user: result.user, token: result.token));
      _reconnectWebSocket();
      unawaited(GetIt.I<FcmService>().init().catchError((_) {}));
    } on Exception catch (e, stack) {
      developer.log('[AuthCubit] register error', error: e, stackTrace: stack);
      emit(AuthError(_friendlyMessage(e)));
    }
  }

  Future<void> updateProfile({
    String? firstName,
    String? lastName,
  }) async {
    final current = state;
    if (current is! AuthAuthenticated) return;
    try {
      final trimmedFirst = firstName?.trim();
      final trimmedLast = lastName?.trim();
      final updated = await _updateProfile(
        firstName: (trimmedFirst == null || trimmedFirst.isEmpty) ? null : trimmedFirst,
        lastName: (trimmedLast == null || trimmedLast.isEmpty) ? null : trimmedLast,
      );
      emit(AuthAuthenticated(user: updated, token: current.token));
    } on Exception catch (e, stack) {
      developer.log('[AuthCubit] updateProfile error',
          error: e, stackTrace: stack);
      rethrow;
    }
  }

  Future<void> logout() async {
    await _logout();
    emit(const AuthUnauthenticated());
  }

  String _friendlyMessage(Exception e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('401') ||
        msg.contains('unauthorized') ||
        msg.contains('invalid')) {
      return 'Correo o contraseña incorrectos.';
    }
    if (msg.contains('400') || msg.contains('already exists')) {
      return 'El correo ya está registrado.';
    }
    if (msg.contains('timeout') || msg.contains('connection')) {
      return 'Sin conexión con el servidor. Verifica tu red.';
    }
    return 'Ocurrió un error. Intenta de nuevo.';
  }

  void _reconnectWebSocket() {
    try {
      final ws = GetIt.I<WebSocketDatasource>();
      final current = state;
      if (current is AuthAuthenticated && current.token.isNotEmpty) {
        ws.setToken(current.token);
      }
      ws.reconnect();
    } on Object {
      // WebSocketDatasource no está en GetIt aún
    }
  }
}
