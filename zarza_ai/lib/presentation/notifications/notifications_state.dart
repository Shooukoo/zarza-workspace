// zarza_ai/lib/presentation/notifications/notifications_state.dart
import '../../domain/entities/notification_entity.dart';

enum NotificationsStatus { initial, loading, success, failure }

class NotificationsState {
  final List<NotificationEntity> items;
  final int unreadCount;
  final int page;
  final bool hasMore;
  final NotificationsStatus status;
  final String? errorMessage;

  NotificationsState({
    required this.items,
    required this.unreadCount,
    required this.page,
    required this.hasMore,
    required this.status,
    this.errorMessage,
  });

  NotificationsState copyWith({
    List<NotificationEntity>? items,
    int? unreadCount,
    int? page,
    bool? hasMore,
    NotificationsStatus? status,
    String? errorMessage,
  }) {
    return NotificationsState(
      items: items ?? this.items,
      unreadCount: unreadCount ?? this.unreadCount,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}
