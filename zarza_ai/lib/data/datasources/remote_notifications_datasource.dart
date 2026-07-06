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
    final response = await _dio.get(
      _baseUrl,
      queryParameters: {'page': page, 'limit': limit},
    );

    final data = response.data as Map<String, dynamic>;
    final itemsJson = (data['items'] as List<dynamic>)
        .cast<Map<String, dynamic>>();

    return NotificationsPage(
      items: itemsJson
          .map((json) => NotificationModel.fromJson(json).toEntity())
          .toList(),
      total: data['total'] as int,
      unreadCount: data['unreadCount'] as int,
      page: data['page'] as int,
    );
  }

  Future<void> markRead(String id) async {
    await _dio.patch('$_baseUrl/$id/read');
  }

  Future<void> markAllRead() async {
    await _dio.patch('$_baseUrl/read-all');
  }

  Future<void> delete(String id) async {
    await _dio.delete('$_baseUrl/$id');
  }
}
