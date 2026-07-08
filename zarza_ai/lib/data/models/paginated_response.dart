import '../../domain/entities/paginated_list.dart';

/// Parsea el envelope unificado `{ data, total, page, limit, totalPages, hasMore }`.
/// Tolera una lista raíz sin envelope (respuestas legacy) derivando la metadata
/// con la heurística anterior (`hasMore = items.length == limit`).
PaginatedList<T> parsePaginated<T>(
  dynamic json,
  T Function(Map<String, dynamic>) itemParser, {
  required int page,
  required int limit,
}) {
  if (json is Map<String, dynamic> && json['data'] is List) {
    final items = (json['data'] as List)
        .cast<Map<String, dynamic>>()
        .map(itemParser)
        .toList();
    final effPage = (json['page'] as num?)?.toInt() ?? page;
    final effLimit = (json['limit'] as num?)?.toInt() ?? limit;
    final total = (json['total'] as num?)?.toInt() ?? items.length;
    return PaginatedList<T>(
      items: items,
      total: total,
      page: effPage,
      limit: effLimit,
      totalPages: (json['totalPages'] as num?)?.toInt() ??
          (effLimit > 0 ? (total / effLimit).ceil() : 1),
      hasMore: json['hasMore'] as bool? ?? (effPage * effLimit < total),
    );
  }

  final rawItems = json is List ? json.cast<Map<String, dynamic>>() : <Map<String, dynamic>>[];
  final items = rawItems.map(itemParser).toList();
  return PaginatedList<T>(
    items: items,
    total: items.length,
    page: page,
    limit: limit,
    totalPages: page,
    hasMore: items.length == limit,
  );
}
