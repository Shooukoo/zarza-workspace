import '../entities/fruit_analysis.dart';

/// Contract for querying analysis results.
abstract class IFruitsRepository {
  Future<FruitAnalysis> getAnalysis(String id);
  Future<List<FruitAnalysis>> getAnalysisList({int page = 1, int limit = 20});
}
