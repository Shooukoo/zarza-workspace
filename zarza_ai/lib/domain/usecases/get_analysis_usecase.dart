import '../entities/fruit_analysis.dart';
import '../repositories/i_fruits_repository.dart';

class GetAnalysisUseCase {
  const GetAnalysisUseCase(this._repository);
  final IFruitsRepository _repository;

  Future<FruitAnalysis> call(String id) => _repository.getAnalysis(id);
}

class GetAnalysisListUseCase {
  const GetAnalysisListUseCase(this._repository);
  final IFruitsRepository _repository;

  Future<List<FruitAnalysis>> call({
    int page = 1,
    int limit = 20,
    String? userId,
    String? startDate,
    String? endDate,
  }) =>
      _repository.getAnalysisList(
        page: page,
        limit: limit,
        userId: userId,
        startDate: startDate,
        endDate: endDate,
      );
}
