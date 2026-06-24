import 'dart:async';

import 'package:dio/dio.dart';

import '../../data/datasources/local_auth_datasource.dart';
import '../auth/auth_cubit.dart';
import '../constants/app_constants.dart';
import '../di/service_locator.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._local);
  final LocalAuthDatasource _local;

  bool _isRefreshing = false;

  // Dio limpio sin interceptores para la llamada de refresh.
  // Usar el Dio principal crearía un bucle: el interceptor añadiría
  // el token caducado a la llamada de refresh, y un 401 re-entrante
  // volvería a disparar el interceptor indefinidamente.
  late final Dio _refreshDio = Dio(
    BaseOptions(baseUrl: AppConstants.baseUrl),
  );

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
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final isAuthEndpoint = err.requestOptions.path.contains('/auth/');

    if (err.response?.statusCode == 401 && !isAuthEndpoint) {
      if (_isRefreshing) {
        // Evitar loops: si ya estamos refrescando, hacer logout directo
        unawaited(sl<AuthCubit>().logout());
        return handler.next(err);
      }

      final refreshToken = await _local.getRefreshToken();
      if (refreshToken == null) {
        unawaited(sl<AuthCubit>().logout());
        return handler.next(err);
      }

      _isRefreshing = true;
      try {
        final response = await _refreshDio.post<Map<String, dynamic>>(
          AppConstants.refreshEndpoint,
          data: {'refreshToken': refreshToken},
        );
        final data = response.data!;
        await _local.saveToken(data['token'] as String);
        await _local.saveRefreshToken(data['refreshToken'] as String);

        // Reintentar la request original con el nuevo access token
        final retryOptions = err.requestOptions;
        retryOptions.headers['Authorization'] = 'Bearer ${data['token']}';
        final retryResponse = await _refreshDio.fetch<dynamic>(retryOptions);
        return handler.resolve(retryResponse);
      } on Exception catch (_) {
        unawaited(sl<AuthCubit>().logout());
        return handler.next(err);
      } finally {
        _isRefreshing = false;
      }
    }

    handler.next(err);
  }
}
