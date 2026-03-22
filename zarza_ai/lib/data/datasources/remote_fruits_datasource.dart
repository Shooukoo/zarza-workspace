import 'package:dio/dio.dart';
import '../../core/constants/app_constants.dart';
import '../models/fruit_analysis_model.dart';

class RemoteFruitsDatasource {
  RemoteFruitsDatasource(this._dio);
  final Dio _dio;

  Future<FruitAnalysisModel> getAnalysis(String id) async {
    final response =
        await _dio.get('${AppConstants.fruitsEndpoint}/$id');
    return FruitAnalysisModel.fromJson(
        response.data as Map<String, dynamic>);
  }

  Future<List<FruitAnalysisModel>> getAnalysisList({
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

    final response = await _dio.get(
      AppConstants.fruitsEndpoint,
      queryParameters: query,
    );

    final data = response.data;
    List<dynamic> items;
    if (data is List) {
      items = data;
    } else if (data is Map && data['data'] is List) {
      items = data['data'] as List;
    } else if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else {
      items = [];
    }

    return items
        .map((e) => FruitAnalysisModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
