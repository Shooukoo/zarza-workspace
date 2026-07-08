// zarza_ai/lib/data/datasources/websocket_datasource.dart
import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../core/constants/app_constants.dart';

class WebSocketDatasource {
  WebSocketDatasource();

  final StreamController<String> _controller =
      StreamController<String>.broadcast();

  bool _disposed = false;
  bool _connecting = false;
  bool _reconnectScheduled = false;
  int _retryCount = 0;
  String? _token;
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;

  Stream<String> get stream => _controller.stream;

  void setToken(String? token) {
    _token = token;
    developer.log('[WebSocket] Token set: ${token != null ? 'YES' : 'NO'}');
  }

  void connect() {
    if (_disposed) return;
    _connectAsync();
  }

  /// Cierra la conexión actual (si existe) y abre una nueva.
  /// El StreamController NO se cierra: los listeners siguen vivos.
  void reconnect() {
    developer.log('[WebSocket] Reconnecting...');
    _disposed = false;
    _retryCount = 0;
    _teardownConnection();
    connect();
  }

  void _teardownConnection() {
    unawaited(_subscription?.cancel() ?? Future.value());
    _subscription = null;
    try {
      _channel?.sink.close();
    } on Object {
      // El sink puede fallar si el socket ya está cerrado
    }
    _channel = null;
    _connecting = false;
  }

  Future<void> _connectAsync() async {
    // Nunca abrir una segunda conexión: si ya hay canal activo o un
    // intento en curso, este llamado (p. ej. un timer de reintento
    // rezagado) no debe crear un socket duplicado.
    if (_disposed || _connecting || _channel != null) return;
    _connecting = true;

    WebSocketChannel channel;
    try {
      channel = WebSocketChannel.connect(Uri.parse(AppConstants.wsUrl));
    } on Object catch (_) {
      _connecting = false;
      _scheduleReconnect();
      return;
    }
    _channel = channel;

    // Subscribe FIRST so handshake errors land in onError instead of
    // becoming unhandled async exceptions (web_socket_channel v3 quirk).
    _subscription = channel.stream.listen(
      (message) {
        if (_disposed) return;
        _retryCount = 0;
        final String decoded;
        if (message is String) {
          decoded = message;
        } else if (message is List<int>) {
          decoded = String.fromCharCodes(message);
        } else {
          decoded = message.toString();
        }
        if (!_controller.isClosed) _controller.add(decoded);
      },
      onError: (Object _) {
        _teardownConnection();
        _scheduleReconnect();
      },
      onDone: () {
        _teardownConnection();
        _scheduleReconnect();
      },
      cancelOnError: true,
    );

    try {
      await channel.ready;
      _connecting = false;

      // Send auth message immediately after connection is ready
      if (_token != null) {
        developer.log('[WebSocket] Sending auth with token');
        channel.sink.add(jsonEncode({
          'event': 'auth',
          'data': {'token': _token},
        }));
      } else {
        developer.log('[WebSocket] No token available, skipping auth');
      }
    } on Object catch (_) {
      _teardownConnection();
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    // Un solo timer de reintento pendiente a la vez.
    if (_disposed || _reconnectScheduled) return;
    _reconnectScheduled = true;
    _retryCount++;
    final seconds = (_retryCount * 5).clamp(5, 60);
    unawaited(Future.delayed(Duration(seconds: seconds), () async {
      _reconnectScheduled = false;
      if (!_disposed) await _connectAsync();
    }));
  }

  void dispose() {
    _disposed = true;
    _teardownConnection();
    if (!_controller.isClosed) _controller.close();
  }
}
