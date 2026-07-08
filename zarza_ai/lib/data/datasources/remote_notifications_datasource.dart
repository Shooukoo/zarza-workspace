// zarza_ai/lib/data/datasources/remote_notifications_datasource.dart
import 'package:dio/dio.dart';
import '../models/notification_model.dart';
import '../../domain/repositories/i_notifications_repository.dart';
import '../../core/constants/app_constants.dart';

class RemoteNotificationsDatasource {
  RemoteNotificationsDatasource(this._dio);

  final Dio _dio;
  final String _baseUrl = '${AppConstants.baseUrl}/api/v1/notifications';

  Future<NotificationsPage> fetchPage(int page, {int limit = 20}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      _baseUrl,
      queryParameters: {'page': page, 'limit': limit},
    );

    final data = response.data as Map<String, dynamic>;
    // Envelope unificado: { data, total, page, limit, totalPages, hasMore, unreadCount }
    final itemsJson =
        (data['data'] as List<dynamic>).cast<Map<String, dynamic>>();

    final total = (data['total'] as num).toInt();
    final currentPage = (data['page'] as num).toInt();
    final effLimit = (data['limit'] as num?)?.toInt() ?? limit;

    return NotificationsPage(
      items: itemsJson
          .map((json) => NotificationModel.fromJson(json).toEntity())
          .toList(),
      total: total,
      unreadCount: (data['unreadCount'] as num).toInt(),
      page: currentPage,
      hasMore: data['hasMore'] as bool? ?? currentPage * effLimit < total,
    );
  }

  Future<void> markRead(String id) async {
    await _dio.patch<void>('$_baseUrl/$id/read');
  }

  Future<void> markAllRead() async {
    await _dio.patch<void>('$_baseUrl/read-all');
  }

  Future<void> delete(String id) async {
    await _dio.delete<void>('$_baseUrl/$id');
  }
}
