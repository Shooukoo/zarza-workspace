import 'package:dio/dio.dart';

import '../../data/datasources/local_auth_datasource.dart';
import '../auth/auth_cubit.dart';
import '../di/service_locator.dart';

/// Interceptor de Dio que:
///  1. Añade `Authorization: Bearer <token>` a todas las requests salientes.
///  2. Ante una respuesta 401, hace logout automático (limpia la sesión).
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._local);
  final LocalAuthDatasource _local;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _local.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expirado o inválido → logout silencioso
      sl<AuthCubit>().logout();
    }
    handler.next(err);
  }
}
