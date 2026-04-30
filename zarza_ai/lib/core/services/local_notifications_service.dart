import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class LocalNotificationsService {
  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static const int _syncNotificationId = 8888;

  Future<void> init() async {
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: darwinSettings,
    );
    await _plugin.initialize(initSettings);
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'zarza_ai_channel',
      'Alertas de Análisis',
      channelDescription:
          'Notificaciones sobre los resultados de análisis fenológico',
      importance: Importance.max,
      priority: Priority.high,
    );
    const platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(),
    );
    await _plugin.show(id, title, body, platformDetails);
  }

  Future<void> showQueuedNotification(int count) async {
    await _plugin.show(
      _syncNotificationId,
      'Zarza AI',
      '$count ${count == 1 ? 'captura pendiente' : 'capturas pendientes'} de subir',
      _syncDetails(ongoing: true),
    );
  }

  Future<void> updateSyncProgress(int done, int total) async {
    await _plugin.show(
      _syncNotificationId,
      'Zarza AI',
      'Sincronizando $done/$total capturas…',
      _syncDetails(ongoing: true),
    );
  }

  Future<void> showFailedNotification(int count) async {
    await _plugin.show(
      _syncNotificationId,
      'Zarza AI',
      '$count ${count == 1 ? 'captura falló' : 'capturas fallaron'}. Abre la app para revisar.',
      _syncDetails(ongoing: false),
    );
  }

  Future<void> dismissSyncNotification() async {
    await _plugin.cancel(_syncNotificationId);
  }

  NotificationDetails _syncDetails({required bool ongoing}) {
    return NotificationDetails(
      android: AndroidNotificationDetails(
        'zarza_ai_sync_channel',
        'Sincronización Offline',
        channelDescription: 'Estado de sincronización de capturas offline',
        importance: Importance.low,
        priority: Priority.low,
        ongoing: ongoing,
        autoCancel: !ongoing,
      ),
      iOS: const DarwinNotificationDetails(),
    );
  }
}
