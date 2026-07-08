// zarza_ai/lib/domain/repositories/i_notifications_repository.dart
import '../entities/notification_entity.dart';

class NotificationsPage {
  final List<NotificationEntity> items;
  final int total;
  final int unreadCount;
  final int page;
  final bool hasMore;

  NotificationsPage({
    required this.items,
    required this.total,
    required this.unreadCount,
    required this.page,
    required this.hasMore,
  });
}

abstract class INotificationsRepository {
  // WebSocket stream (existente)
  Stream<String> watchNotifications();

  // Métodos REST nuevos
  Future<NotificationsPage> fetchPage(int page, {int limit = 20});
  Future<void> markRead(String id);
  Future<void> markAllRead();
  Future<void> delete(String id);

  void dispose();
}
