import '../../domain/entities/fruit_analysis.dart';
import '../../domain/repositories/i_fruits_repository.dart';
import '../datasources/remote_fruits_datasource.dart';

class FruitsRepositoryImpl implements IFruitsRepository {
  FruitsRepositoryImpl(this._datasource);
  final RemoteFruitsDatasource _datasource;

  @override
  Future<FruitAnalysis> getAnalysis(String id) async {
    final model = await _datasource.getAnalysis(id);
    return model.toEntity();
  }

  @override
  Future<List<FruitAnalysis>> getAnalysisList({
    int page = 1,
    int limit = 20,
    String? userId,
    String? startDate,
    String? endDate,
  }) async {
    final models = await _datasource.getAnalysisList(
      page: page,
      limit: limit,
      userId: userId,
      startDate: startDate,
      endDate: endDate,
    );
    return models.map((m) => m.toEntity()).toList();
  }
}
