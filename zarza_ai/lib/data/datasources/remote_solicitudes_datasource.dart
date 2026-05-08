import 'package:dio/dio.dart';
import '../../core/constants/app_constants.dart';
import '../models/solicitud_model.dart';

class RemoteSolicitudesDatasource {
  RemoteSolicitudesDatasource(this._dio);
  final Dio _dio;

  Future<List<SolicitudModel>> getSolicitudes({
    int page = 1,
    int limit = 20,
    String? estado,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit};
    if (estado != null) query['estado'] = estado;

    final response = await _dio.get(
      AppConstants.solicitudesEndpoint,
      queryParameters: query,
    );

    final data = response.data;
    List<dynamic> items;
    if (data is Map && data['data'] is List) {
      items = data['data'] as List;
    } else if (data is List) {
      items = data;
    } else {
      items = [];
    }

    return items
        .map((e) => SolicitudModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<SolicitudModel> updateEstado(String id, String estado) async {
    final response = await _dio.patch(
      '${AppConstants.solicitudesEndpoint}/$id/estado',
      data: {'estado': estado},
    );
    return SolicitudModel.fromJson(response.data as Map<String, dynamic>);
  }
}
