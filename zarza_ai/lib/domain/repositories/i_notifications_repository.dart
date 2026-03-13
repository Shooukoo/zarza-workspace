/// Contract for receiving real-time backend notifications via WebSocket.
abstract class INotificationsRepository {
  Stream<String> watchNotifications();
  void dispose();
}
