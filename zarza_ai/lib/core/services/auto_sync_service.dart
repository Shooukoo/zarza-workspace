import 'dart:async';

import 'connectivity_service.dart';
import 'sync_service.dart';

class AutoSyncService {
  AutoSyncService({
    required ConnectivityService connectivity,
    required SyncService sync,
  })  : _connectivity = connectivity,
        _sync = sync;

  final ConnectivityService _connectivity;
  final SyncService _sync;
  StreamSubscription<bool>? _sub;

  void start() {
    _sub = _connectivity.onConnectivityChanged.listen((isConnected) {
      if (isConnected) {
        _sync.syncPending().catchError((_) {});
      }
    });
  }

  void dispose() => _sub?.cancel();
}
