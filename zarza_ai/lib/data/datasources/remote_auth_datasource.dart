import 'dart:developer' as developer;
import 'package:dio/dio.dart';

import '../../core/constants/app_constants.dart';
import '../models/auth_response_model.dart';

class RemoteAuthDatasource {
  RemoteAuthDatasource(this._dio);
  final Dio _dio;

  Future<AuthResponseModel> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        AppConstants.loginEndpoint,
        data: {'email': email, 'password': password},
      );
      return AuthResponseModel.fromJson(response.data!);
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        developer.log('[RemoteAuthDatasource] Login timeout: ${e.type}');
        throw DioException(
          requestOptions: e.requestOptions,
          type: e.type,
          message: 'Tiempo de conexión agotado. Verifica tu red.',
        );
      }
      developer.log('[RemoteAuthDatasource] DioError: ${e.type} - ${e.response?.statusCode}');
      rethrow;
    } catch (e, stack) {
      developer.log('[RemoteAuthDatasource] Error general', error: e, stackTrace: stack);
      rethrow;
    }
  }

  Future<AuthResponseModel> register({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      AppConstants.registerEndpoint,
      data: {'email': email, 'password': password},
    );
    return AuthResponseModel.fromJson(response.data!);
  }
}
