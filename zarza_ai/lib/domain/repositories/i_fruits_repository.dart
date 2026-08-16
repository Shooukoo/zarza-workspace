import '../entities/fruit_analysis.dart';
import '../entities/paginated_list.dart';

/// Contract for querying analysis results.
abstract class IFruitsRepository {
  Future<FruitAnalysis> getAnalysis(String id);
  Future<PaginatedList<FruitAnalysis>> getAnalysisList({
    int page = 1,
    int limit = 20,
    String? userId,
    String? startDate,
    String? endDate,
  });
  Future<FruitAnalysis> validateAnalysis({
    required String id,
    required String action,
    List<Map<String, dynamic>>? cronogramaCorregido,
    String? observaciones,
  });
}
