// zarza_ai/lib/presentation/notifications/notifications_event.dart
import '../../domain/entities/notification_entity.dart';

abstract class NotificationsEvent {}

class LoadNotifications extends NotificationsEvent {}
class LoadMoreNotifications extends NotificationsEvent {}
class MarkNotificationRead extends NotificationsEvent {
  MarkNotificationRead(this.id);
  final String id;
}
class MarkAllNotificationsRead extends NotificationsEvent {}
class DeleteNotification extends NotificationsEvent {
  DeleteNotification(this.id);
  final String id;
}
class WsNotificationReceived extends NotificationsEvent {
  WsNotificationReceived(this.notification);
  final NotificationEntity notification;
}
