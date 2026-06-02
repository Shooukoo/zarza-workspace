// zarza_ai/lib/data/datasources/websocket_datasource.dart
import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../core/constants/app_constants.dart';

class WebSocketDatasource {
  WebSocketDatasource();

  final StreamController<String> _controller =
      StreamController<String>.broadcast();

  bool _disposed = false;
  bool _connecting = false;
  int _retryCount = 0;
  String? _token;
  StreamSubscription<dynamic>? _subscription;

  Stream<String> get stream => _controller.stream;

  void setToken(String? token) {
    _token = token;
  }

  void connect() {
    if (_disposed) return;
    _connectAsync();
  }

  Future<void> _connectAsync() async {
    if (_disposed || _connecting) return;
    _connecting = true;

    WebSocketChannel channel;
    try {
      channel = WebSocketChannel.connect(Uri.parse(AppConstants.wsUrl));
    } on Object catch (_) {
      _connecting = false;
      _scheduleReconnect();
      return;
    }

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
        unawaited(_subscription?.cancel() ?? Future.value());
        _subscription = null;
        _connecting = false;
        _scheduleReconnect();
      },
      onDone: () {
        unawaited(_subscription?.cancel() ?? Future.value());
        _subscription = null;
        _connecting = false;
        _scheduleReconnect();
      },
      cancelOnError: true,
    );

    try {
      await channel.ready;
      _connecting = false;

      // Send auth message immediately after connection is ready
      if (_token != null) {
        channel.sink.add(jsonEncode({
          'event': 'auth',
          'data': {'token': _token},
        }));
      }
    } on Object catch (_) {
      unawaited(_subscription?.cancel() ?? Future.value());
      _subscription = null;
      _connecting = false;
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _retryCount++;
    final seconds = (_retryCount * 5).clamp(5, 60);
    unawaited(Future.delayed(Duration(seconds: seconds), () async {
      if (!_disposed) await _connectAsync();
    }));
  }

  void dispose() {
    _disposed = true;
    unawaited(_subscription?.cancel() ?? Future.value());
    if (!_controller.isClosed) _controller.close();
  }
}
