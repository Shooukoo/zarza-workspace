import 'dart:async';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../core/constants/app_constants.dart';

/// WebSocket data source — robust against connection failures.
///
/// Key fix: in web_socket_channel v3, a failed handshake pushes an error
/// BOTH to [channel.ready] and to [channel.stream] at the same time.
/// If the stream has no listener when the error is emitted it becomes an
/// "unhandled async exception" in Flutter. Solution: subscribe to the stream
/// BEFORE awaiting [channel.ready], so the stream's onError callback is
/// always the one that receives the failure.
class WebSocketDatasource {
  WebSocketDatasource();

  final StreamController<String> _controller =
      StreamController<String>.broadcast();

  bool _disposed = false;
  int _retryCount = 0;
  StreamSubscription<dynamic>? _subscription;

  Stream<String> get stream => _controller.stream;

  void connect() {
    if (_disposed) return;
    _connectAsync();
  }

  Future<void> _connectAsync() async {
    if (_disposed) return;

    WebSocketChannel channel;
    try {
      channel = WebSocketChannel.connect(Uri.parse(AppConstants.wsUrl));
    } catch (_) {
      _scheduleReconnect();
      return;
    }

    // Subscribe FIRST — before awaiting ready — so the stream's onError
    // receives any handshake failure instead of it becoming unhandled.
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
        _subscription?.cancel();
        _subscription = null;
        _scheduleReconnect();
      },
      onDone: () => _scheduleReconnect(),
      cancelOnError: true,
    );

    // Now await the ready future. If it throws we cancel the subscription
    // and schedule a retry. The stream's onError might also fire — that's
    // fine; _scheduleReconnect is idempotent via the _disposed guard.
    try {
      await channel.ready;
    } catch (_) {
      _subscription?.cancel();
      _subscription = null;
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _retryCount++;
    final seconds = (_retryCount * 5).clamp(5, 60);
    Future.delayed(Duration(seconds: seconds), () {
      if (!_disposed) _connectAsync();
    });
  }

  void dispose() {
    _disposed = true;
    _subscription?.cancel();
    if (!_controller.isClosed) _controller.close();
  }
}
