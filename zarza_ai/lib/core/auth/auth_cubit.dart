import 'dart:developer' as developer;
import 'package:flutter_bloc/flutter_bloc.dart';

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
        // El token se usa internamente por el interceptor; no necesitamos
        // exponerlo aquí — sólo el UserEntity es relevante para la UI/router.
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
    print('>>> [AuthCubit] Iniciando login para $email');
    emit(const AuthLoading());
    try {
      final result = await _login(email: email, password: password);
      print('>>> [AuthCubit] Login exitoso, emitiendo estado.');
      emit(AuthAuthenticated(user: result.user, token: result.token));
    } on Exception catch (e, stack) {
      print('>>> [AuthCubit] exception (Exception): $e\n$stack');
      emit(AuthError(_friendlyMessage(e)));
    } catch (e, stack) {
      print('>>> [AuthCubit] exception (General): $e\n$stack');
      emit(AuthError('Error desconocido.'));
    }
  }

  /// Crea un nuevo usuario como administrador.
  /// La sesión del admin **no cambia** — se emite [AdminCreateUserSuccess].
  Future<void> registerAsAdmin({
    required String email,
    required String password,
  }) async {
    // Guardamos el estado actual del admin para restaurarlo si algo va mal
    final previousState = state;
    emit(const AuthLoading());
    try {
      final result = await _register(email: email, password: password);
      // Restaurar sesión del admin y notificar éxito
      emit(previousState);
      emit(AdminCreateUserSuccess(result.user.email));
    } on Exception catch (e) {
      emit(previousState);
      emit(AuthError(_adminFriendlyMessage(e)));
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

  String _adminFriendlyMessage(Exception e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('403') || msg.contains('forbidden')) {
      return 'No tienes permisos para crear usuarios.';
    }
    if (msg.contains('400') || msg.contains('already exists')) {
      return 'Ese correo ya tiene una cuenta registrada.';
    }
    if (msg.contains('timeout') || msg.contains('connection')) {
      return 'Sin conexión con el servidor. Verifica tu red.';
    }
    return 'No se pudo crear el usuario. Intenta de nuevo.';
  }
}
