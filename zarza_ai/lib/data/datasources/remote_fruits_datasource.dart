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
  }) async {
    final response = await _dio.get(
      AppConstants.fruitsEndpoint,
      queryParameters: {'page': page, 'limit': limit},
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
