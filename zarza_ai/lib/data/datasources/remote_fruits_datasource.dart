import 'package:dio/dio.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/entities/paginated_list.dart';
import '../models/fruit_analysis_model.dart';
import '../models/paginated_response.dart';

class RemoteFruitsDatasource {
  RemoteFruitsDatasource(this._dio);
  final Dio _dio;

  Future<FruitAnalysisModel> getAnalysis(String id) async {
    final response =
        await _dio.get<dynamic>('${AppConstants.fruitsEndpoint}/$id');

    return FruitAnalysisModel.fromJson(
        response.data as Map<String, dynamic>);
  }

  Future<PaginatedList<FruitAnalysisModel>> getAnalysisList({
    int page = 1,
    int limit = AppConstants.defaultPageSize,
    String? userId,
    String? startDate,
    String? endDate,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit};
    if (userId != null) query['user_id'] = userId;
    if (startDate != null) query['start_date'] = startDate;
    if (endDate != null) query['end_date'] = endDate;

    final response = await _dio.get<dynamic>(
      AppConstants.fruitsEndpoint,
      queryParameters: query,
    );

    return parsePaginated(
      response.data,
      FruitAnalysisModel.fromJson,
      page: page,
      limit: limit,
    );
  }

  Future<FruitAnalysisModel> validateAnalysis({
    required String id,
    required String action,
    List<Map<String, dynamic>>? cronogramaCorregido,
    String? observaciones,
  }) async {
    final data = <String, dynamic>{
      'action': action,
    };

    if (cronogramaCorregido != null) {
      data['cronograma_corregido'] = cronogramaCorregido;
    }

    if (observaciones != null) {
      data['observaciones'] = observaciones;
    }

    final response = await _dio.patch<dynamic>(
      '${AppConstants.analysesEndpoint}/$id/validate',
      data: data,
    );

    return FruitAnalysisModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }
}
