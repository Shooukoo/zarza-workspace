import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Manejador de mensajes en segundo plano (debe ser función de nivel superior).
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Mensaje data-only: leer título/body del map de datos
  final title = message.data['title'] as String? ?? 'RubusAI';
  final body  = message.data['body']  as String? ?? '';
  if (title.isEmpty) return;

  final plugin = FlutterLocalNotificationsPlugin();
  await plugin.initialize(
    const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    ),
  );
  await plugin.show(
    message.hashCode,
    title,
    body,
    const NotificationDetails(
      android: AndroidNotificationDetails(
        'rubus_ai_push_channel',
        'Notificaciones RubusAI',
        channelDescription: 'Alertas de análisis y solicitudes',
        importance: Importance.max,
        priority: Priority.high,
      ),
    ),
  );
}

class FcmService {
  FcmService(this._dio);
  final Dio _dio;

  Future<void> init() async {
    final messaging = FirebaseMessaging.instance;

    // Pedir permiso (Android 13+, iOS siempre)
    final settings = await messaging.requestPermission(alert: true, badge: true, sound: true);
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    // En foreground el WebSocket ya muestra la notificación local —
    // suprimir la notificación automática de FCM para evitar duplicados.
    await messaging.setForegroundNotificationPresentationOptions(
      alert: false,
      badge: false,
      sound: false,
    );

    // Consumir el mensaje en foreground sin mostrarlo (evita duplicado FCM+WS).
    FirebaseMessaging.onMessage.listen((_) {});

    // Obtener token y registrarlo en el backend
    final token = await messaging.getToken();
    if (token != null) await _registerToken(token);

    // Actualizar token cuando Firebase lo rota
    messaging.onTokenRefresh.listen(_registerToken);
  }

  Future<void> _registerToken(String token) async {
    try {
      await _dio.patch('/api/auth/fcm-token', data: {'token': token});
    } on Exception {
      // Ignorar si el backend no está disponible — se reintentará en el próximo arranque
    }
  }
}
