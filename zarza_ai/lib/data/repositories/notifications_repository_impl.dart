// zarza_ai/lib/data/repositories/notifications_repository_impl.dart
import 'dart:async';

import '../../domain/repositories/i_notifications_repository.dart';
import '../datasources/local_auth_datasource.dart';
import '../datasources/websocket_datasource.dart';

class NotificationsRepositoryImpl implements INotificationsRepository {
  NotificationsRepositoryImpl(this._datasource, this._localAuth) {
    unawaited(_init());
  }

  final WebSocketDatasource _datasource;
  final LocalAuthDatasource _localAuth;

  Future<void> _init() async {
    final token = await _localAuth.getToken();
    _datasource.setToken(token);
    _datasource.connect();
  }

  @override
  Stream<String> watchNotifications() => _datasource.stream;

  @override
  void dispose() => _datasource.dispose();
}
