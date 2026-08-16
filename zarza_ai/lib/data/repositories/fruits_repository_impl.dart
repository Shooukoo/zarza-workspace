import '../../domain/entities/fruit_analysis.dart';
import '../../domain/entities/paginated_list.dart';
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
  Future<PaginatedList<FruitAnalysis>> getAnalysisList({
    int page = 1,
    int limit = 20,
    String? userId,
    String? startDate,
    String? endDate,
  }) async {
    final result = await _datasource.getAnalysisList(
      page: page,
      limit: limit,
      userId: userId,
      startDate: startDate,
      endDate: endDate,
    );
    return result.map((m) => m.toEntity());
  }

  @override
  Future<FruitAnalysis> validateAnalysis({
    required String id,
    required String action,
    List<Map<String, dynamic>>? cronogramaCorregido,
    String? observaciones,
  }) async {
    final model = await _datasource.validateAnalysis(
      id: id,
      action: action,
      cronogramaCorregido: cronogramaCorregido,
      observaciones: observaciones,
    );

    return model.toEntity();
  }
}
