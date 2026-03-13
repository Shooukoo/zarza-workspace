import '../../domain/repositories/i_notifications_repository.dart';
import '../datasources/websocket_datasource.dart';

class NotificationsRepositoryImpl implements INotificationsRepository {
  NotificationsRepositoryImpl(this._datasource) {
    _datasource.connect();
  }
  final WebSocketDatasource _datasource;

  @override
  Stream<String> watchNotifications() => _datasource.stream;

  @override
  void dispose() => _datasource.dispose();
}
