// zarza_ai/lib/domain/entities/notification_entity.dart
class NotificationEntity {
  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final bool isRead;
  final DateTime createdAt;
  final DateTime expiresAt;

  NotificationEntity({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.data,
    required this.isRead,
    required this.createdAt,
    required this.expiresAt,
  });
}
