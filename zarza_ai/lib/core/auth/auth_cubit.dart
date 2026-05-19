import 'dart:developer' as developer;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';

import '../../core/services/fcm_service.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/register_usecase.dart';
import 'auth_state.dart';

/// Cubit global que gestiona el estado de sesión de toda la aplicación.
///
/// Es un **singleton** registrado en GetIt. El router lo escucha para redirigir
/// automáticamente entre rutas protegidas y públicas.
class AuthCubit extends Cubit<AuthState> {
  AuthCubit({
    required LoginUseCase loginUseCase,
    required RegisterUseCase registerUseCase,
    required LogoutUseCase logoutUseCase,
    required GetCurrentUserUseCase getCurrentUserUseCase,
  })  : _login = loginUseCase,
        _register = registerUseCase,
        _logout = logoutUseCase,
        _getCurrentUser = getCurrentUserUseCase,
        super(const AuthInitial());

  final LoginUseCase _login;
  final RegisterUseCase _register;
  final LogoutUseCase _logout;
  final GetCurrentUserUseCase _getCurrentUser;

  /// Verifica si hay una sesión persistida. Debe llamarse al arrancar la app.
  Future<void> checkSession() async {
    emit(const AuthLoading());
    try {
      final user = await _getCurrentUser();
      if (user != null) {
        emit(AuthAuthenticated(user: user, token: ''));
      } else {
        emit(const AuthUnauthenticated());
      }
    } catch (_) {
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
      GetIt.I<FcmService>().init().catchError((_) {});
    } on Exception catch (e, stack) {
      developer.log('[AuthCubit] login error', error: e, stackTrace: stack);
      emit(AuthError(_friendlyMessage(e)));
    } catch (e, stack) {
      developer.log('[AuthCubit] login unexpected error', error: e, stackTrace: stack);
      emit(AuthError('Error desconocido.'));
    }
  }

  /// Auto-registro de usuario nuevo. Emite [AuthAuthenticated] en éxito.
  Future<void> register({
    required String email,
    required String password,
  }) async {
    emit(const AuthLoading());
    try {
      final result = await _register(email: email, password: password);
      emit(AuthAuthenticated(user: result.user, token: result.token));
      GetIt.I<FcmService>().init().catchError((_) {});
    } on Exception catch (e, stack) {
      developer.log('[AuthCubit] register error', error: e, stackTrace: stack);
      emit(AuthError(_friendlyMessage(e)));
    } catch (e, stack) {
      developer.log('[AuthCubit] register unexpected error', error: e, stackTrace: stack);
      emit(AuthError('Error desconocido.'));
    }
  }

  Future<void> logout() async {
    await _logout();
    emit(const AuthUnauthenticated());
  }

  String _friendlyMessage(Exception e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('401') || msg.contains('unauthorized') || msg.contains('invalid')) {
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
}
