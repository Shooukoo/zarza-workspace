import 'package:dio/dio.dart';
import '../models/campo_model.dart';

class RemoteCamposDatasource {
  RemoteCamposDatasource(this._dio);
  final Dio _dio;

  Future<List<CampoModel>> getCampos() async {
    final response = await _dio.get<List<dynamic>>('/api/v1/campos');
    final data = response.data ?? [];
    return data
        .cast<Map<String, dynamic>>()
        .map(CampoModel.fromJson)
        .toList();
  }
}
