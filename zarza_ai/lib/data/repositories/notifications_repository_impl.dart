// zarza_ai/lib/data/repositories/notifications_repository_impl.dart
import 'dart:async';

import '../../domain/repositories/i_notifications_repository.dart';
import '../datasources/local_auth_datasource.dart';
import '../datasources/websocket_datasource.dart';
import '../datasources/remote_notifications_datasource.dart';

class NotificationsRepositoryImpl implements INotificationsRepository {
  NotificationsRepositoryImpl(
    this._datasource,
    this._localAuth,
    this._remoteNotifications,
  ) {
    unawaited(_init());
  }

  final WebSocketDatasource _datasource;
  final LocalAuthDatasource _localAuth;
  final RemoteNotificationsDatasource _remoteNotifications;

  Future<void> _init() async {
    final token = await _localAuth.getToken();
    _datasource.setToken(token);
    _datasource.connect();
  }

  @override
  Stream<String> watchNotifications() => _datasource.stream;

  @override
  Future<NotificationsPage> fetchPage(int page, {int limit = 20}) =>
      _remoteNotifications.fetchPage(page, limit: limit);

  @override
  Future<void> markRead(String id) => _remoteNotifications.markRead(id);

  @override
  Future<void> markAllRead() => _remoteNotifications.markAllRead();

  @override
  Future<void> delete(String id) => _remoteNotifications.delete(id);

  @override
  void dispose() => _datasource.dispose();
}
