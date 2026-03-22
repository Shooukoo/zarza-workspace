import 'dart:developer' as developer;
import 'package:dio/dio.dart';

import '../../core/constants/app_constants.dart';
import '../models/auth_response_model.dart';

/// Datasource remoto para los endpoints de autenticación del backend NestJS.
class RemoteAuthDatasource {
  RemoteAuthDatasource(this._dio);
  final Dio _dio;

  Future<AuthResponseModel> login({
    required String email,
    required String password,
  }) async {
    try {
      print('>>> [RemoteAuthDatasource] Intentando login en ${AppConstants.loginEndpoint} con email: $email');
      final response = await _dio.post<Map<String, dynamic>>(
        AppConstants.loginEndpoint,
        data: {'email': email, 'password': password},
      );
      print('>>> [RemoteAuthDatasource] Respuesta login recibida: ${response.statusCode} - Data: ${response.data}');
      return AuthResponseModel.fromJson(response.data!);
    } on DioException catch (e) {
      print('>>> [RemoteAuthDatasource] DioError: ${e.message} - Response: ${e.response?.data}');
      rethrow;
    } catch (e, stack) {
      print('>>> [RemoteAuthDatasource] Error General: $e\n$stack');
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
