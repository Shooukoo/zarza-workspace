import 'package:dio/dio.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/entities/paginated_list.dart';
import '../models/paginated_response.dart';
import '../models/solicitud_model.dart';

class RemoteSolicitudesDatasource {
  RemoteSolicitudesDatasource(this._dio);
  final Dio _dio;

  Future<PaginatedList<SolicitudModel>> getSolicitudes({
    int page = 1,
    int limit = 20,
    String? estado,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit};
    if (estado != null) query['estado'] = estado;

    final response = await _dio.get<dynamic>(
      AppConstants.solicitudesEndpoint,
      queryParameters: query,
    );

    return parsePaginated(
      response.data,
      SolicitudModel.fromJson,
      page: page,
      limit: limit,
    );
  }

  Future<SolicitudModel> getById(String id) async {
    final response = await _dio.get<dynamic>(
      '${AppConstants.solicitudesEndpoint}/$id',
    );
    return SolicitudModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SolicitudModel> updateEstado(String id, String estado) async {
    final response = await _dio.patch<dynamic>(
      '${AppConstants.solicitudesEndpoint}/$id/estado',
      data: {'estado': estado},
    );
    return SolicitudModel.fromJson(response.data as Map<String, dynamic>);
  }
}
