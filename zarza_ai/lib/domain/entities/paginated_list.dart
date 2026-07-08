/// Página de resultados del contrato de paginación unificado del backend:
/// `{ data, total, page, limit, totalPages, hasMore }`.
class PaginatedList<T> {
  const PaginatedList({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
    required this.hasMore,
  });

  final List<T> items;
  final int total;
  final int page;
  final int limit;
  final int totalPages;
  final bool hasMore;

  PaginatedList<R> map<R>(R Function(T) convert) => PaginatedList<R>(
        items: items.map(convert).toList(),
        total: total,
        page: page,
        limit: limit,
        totalPages: totalPages,
        hasMore: hasMore,
      );
}
