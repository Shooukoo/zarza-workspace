import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';

import '../../core/constants/app_constants.dart';
import '../../core/auth/auth_cubit.dart';
import '../../core/network/auth_interceptor.dart';
import '../../core/services/local_notifications_service.dart';
// Auth — Data
import '../../data/datasources/local_auth_datasource.dart';
import '../../data/datasources/remote_auth_datasource.dart';
import '../../data/datasources/remote_ingestion_datasource.dart';
import '../../data/datasources/remote_fruits_datasource.dart';
import '../../data/datasources/websocket_datasource.dart';
// Notifications — Data
import '../../data/datasources/remote_notifications_datasource.dart';
// Admin — Data
import '../../data/datasources/remote_admin_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/fruits_repository_impl.dart';
import '../../data/repositories/notifications_repository_impl.dart';
import '../../data/repositories/admin_repository_impl.dart';
// Data — offline queue
import '../../data/datasources/app_database.dart';
import '../../data/datasources/local_queue_datasource.dart';
import '../../data/datasources/remote_campos_datasource.dart';
import '../../data/repositories/campos_repository_impl.dart';
import '../../data/repositories/offline_aware_ingestion_repository.dart';
import '../../data/repositories/offline_queue_repository_impl.dart';
// Domain
import '../../domain/repositories/i_auth_repository.dart';
import '../../domain/repositories/i_ingestion_repository.dart';
import '../../domain/repositories/i_fruits_repository.dart';
import '../../domain/repositories/i_notifications_repository.dart';
import '../../domain/repositories/i_admin_repository.dart';
// Domain — offline queue
import '../../domain/repositories/i_campos_repository.dart';
import '../../domain/repositories/i_offline_queue_repository.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/register_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../domain/usecases/update_profile_usecase.dart';
import '../../domain/usecases/upload_image_usecase.dart';
import '../../domain/usecases/get_analysis_usecase.dart';
import '../../domain/usecases/watch_notifications_usecase.dart';
// Notifications — Use cases
import '../../domain/usecases/get_notifications_usecase.dart';
import '../../domain/usecases/mark_read_usecase.dart';
import '../../domain/usecases/mark_all_read_usecase.dart';
import '../../domain/usecases/delete_notification_usecase.dart';
import '../../domain/usecases/get_users_usecase.dart';
import '../../domain/usecases/update_user_role_usecase.dart';
import '../../domain/usecases/get_admin_stats_usecase.dart';
import '../../domain/usecases/create_user_usecase.dart';
import '../../domain/usecases/delete_pending_upload_usecase.dart';
import '../../domain/usecases/get_campos_usecase.dart';
import '../../domain/usecases/sync_pending_uploads_usecase.dart';
import '../../domain/usecases/watch_pending_uploads_usecase.dart';
// Core services
import '../services/auto_sync_service.dart';
import '../services/connectivity_service.dart';
import '../services/fcm_service.dart';
import '../services/image_compression_service.dart';
import '../services/sync_service.dart';
// Presentation
import '../../presentation/capture/capture_bloc.dart';
import '../../presentation/results/results_bloc.dart';
import '../../presentation/history/history_bloc.dart';
import '../../presentation/admin/admin_blocs/admin_bloc.dart';
import '../../presentation/admin/admin_blocs/admin_dashboard_bloc.dart';
import '../../presentation/queue/offline_queue_bloc.dart';
// Notifications — Presentation
import '../../presentation/notifications/notifications_bloc.dart';
// Solicitudes — Data
import '../../data/datasources/remote_solicitudes_datasource.dart';
import '../../data/repositories/solicitudes_repository_impl.dart';
// Solicitudes — Domain
import '../../domain/repositories/i_solicitudes_repository.dart';
import '../../domain/usecases/get_solicitudes_usecase.dart';
import '../../domain/usecases/get_solicitud_by_id_usecase.dart';
import '../../domain/usecases/update_solicitud_estado_usecase.dart';
// Solicitudes — Presentation
import '../../presentation/solicitudes/solicitudes_bloc.dart';
import '../../presentation/solicitudes/solicitud_detail_bloc.dart';

final sl = GetIt.instance;

Future<void> setupServiceLocator() async {
  // ── External ───────────────────────────────────────────────────────────────
  sl.registerLazySingleton<LocalNotificationsService>(
    () => LocalNotificationsService(),
  );
  await sl<LocalNotificationsService>().init();

  sl.registerLazySingleton<ImageCompressionService>(
    () => const ImageCompressionServiceImpl(),
  );

  sl.registerLazySingleton<FcmService>(() => FcmService(sl<Dio>()));

  sl.registerLazySingleton<FlutterSecureStorage>(
    () => const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    ),
  );

  sl.registerLazySingleton<Dio>(() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout:
            const Duration(seconds: AppConstants.uploadTimeoutSeconds),
        headers: {'Accept': 'application/json'},
      ),
    );
    // El interceptor se añade después del registro del AuthCubit
    return dio;
  });

  // ── Auth — Data Sources ────────────────────────────────────────────────────
  sl.registerLazySingleton<LocalAuthDatasource>(
    () => LocalAuthDatasource(sl<FlutterSecureStorage>()),
  );

  sl.registerLazySingleton<RemoteAuthDatasource>(
    () => RemoteAuthDatasource(sl<Dio>()),
  );

  // ── Auth — Repository ──────────────────────────────────────────────────────
  sl.registerLazySingleton<IAuthRepository>(
    () => AuthRepositoryImpl(
      remote: sl<RemoteAuthDatasource>(),
      local: sl<LocalAuthDatasource>(),
      dio: sl<Dio>(),
    ),
  );

  // ── Auth — Use Cases ───────────────────────────────────────────────────────
  sl.registerLazySingleton<LoginUseCase>(
    () => LoginUseCase(sl<IAuthRepository>()),
  );
  sl.registerLazySingleton<RegisterUseCase>(
    () => RegisterUseCase(sl<IAuthRepository>()),
  );
  sl.registerLazySingleton<LogoutUseCase>(
    () => LogoutUseCase(sl<IAuthRepository>()),
  );
  sl.registerLazySingleton<GetCurrentUserUseCase>(
    () => GetCurrentUserUseCase(sl<IAuthRepository>()),
  );
  sl.registerLazySingleton<UpdateProfileUseCase>(
    () => UpdateProfileUseCase(sl<IAuthRepository>()),
  );

  // ── Auth Cubit (singleton global) ─────────────────────────────────────────
  sl.registerLazySingleton<AuthCubit>(
    () => AuthCubit(
      loginUseCase: sl<LoginUseCase>(),
      registerUseCase: sl<RegisterUseCase>(),
      logoutUseCase: sl<LogoutUseCase>(),
      getCurrentUserUseCase: sl<GetCurrentUserUseCase>(),
      updateProfileUseCase: sl<UpdateProfileUseCase>(),
    ),
  );

  // Inyectar AuthInterceptor en Dio ahora que AuthCubit está registrado
  sl<Dio>().interceptors.add(AuthInterceptor(sl<LocalAuthDatasource>()));

  // ── Data Sources (existentes) ──────────────────────────────────────────────
  sl.registerLazySingleton<WebSocketDatasource>(() => WebSocketDatasource());

  sl.registerLazySingleton<RemoteIngestionDatasource>(
      () => RemoteIngestionDatasource(sl<Dio>()));

  sl.registerLazySingleton<RemoteFruitsDatasource>(
      () => RemoteFruitsDatasource(sl<Dio>()));

  // ── Notifications — Data Source ────────────────────────────────────────────
  sl.registerLazySingleton<RemoteNotificationsDatasource>(
    () => RemoteNotificationsDatasource(sl<Dio>()),
  );

  // ── Offline queue ──────────────────────────────────────────────────────────
  sl.registerLazySingleton<AppDatabase>(() => AppDatabase());

  sl.registerLazySingleton<LocalQueueDatasource>(
      () => LocalQueueDatasource(sl<AppDatabase>()));

  sl.registerLazySingleton<IOfflineQueueRepository>(
      () => OfflineQueueRepositoryImpl(sl<LocalQueueDatasource>()));

  sl.registerLazySingleton<ConnectivityService>(
      () => ConnectivityService(Connectivity()));

  sl.registerLazySingleton<SyncService>(() => SyncService(
        queue: sl<IOfflineQueueRepository>(),
        remote: sl<RemoteIngestionDatasource>(),
        notifications: sl<LocalNotificationsService>(),
      ));

  sl.registerLazySingleton<AutoSyncService>(() => AutoSyncService(
        connectivity: sl<ConnectivityService>(),
        sync: sl<SyncService>(),
      ));

  // ── Campos ────────────────────────────────────────────────────────────────
  sl.registerLazySingleton<RemoteCamposDatasource>(
      () => RemoteCamposDatasource(sl<Dio>()));

  sl.registerLazySingleton<ICamposRepository>(
      () => CamposRepositoryImpl(sl<RemoteCamposDatasource>()));

  sl.registerLazySingleton<GetCamposUseCase>(
      () => GetCamposUseCase(sl<ICamposRepository>()));

  // ── Repositories (existentes) ──────────────────────────────────────────────
  sl.registerLazySingleton<IIngestionRepository>(
    () => OfflineAwareIngestionRepository(
      remote: sl<RemoteIngestionDatasource>(),
      queue: sl<IOfflineQueueRepository>(),
      connectivity: sl<ConnectivityService>(),
      notifications: sl<LocalNotificationsService>(),
    ),
  );

  sl.registerLazySingleton<IFruitsRepository>(
      () => FruitsRepositoryImpl(sl<RemoteFruitsDatasource>()));

  sl.registerLazySingleton<INotificationsRepository>(
      () => NotificationsRepositoryImpl(
            sl<WebSocketDatasource>(),
            sl<LocalAuthDatasource>(),
            sl<RemoteNotificationsDatasource>(),
          ));

  // ── Use Cases (existentes) ─────────────────────────────────────────────────
  sl.registerLazySingleton<UploadImageUseCase>(
      () => UploadImageUseCase(sl<IIngestionRepository>()));

  sl.registerLazySingleton<GetAnalysisUseCase>(
      () => GetAnalysisUseCase(sl<IFruitsRepository>()));

  sl.registerLazySingleton<GetAnalysisListUseCase>(
      () => GetAnalysisListUseCase(sl<IFruitsRepository>()));

  sl.registerLazySingleton<WatchNotificationsUseCase>(
      () => WatchNotificationsUseCase(sl<INotificationsRepository>()));

  // ── Notifications — Use Cases ─────────────────────────────────────────────
  sl.registerLazySingleton<GetNotificationsUseCase>(
    () => GetNotificationsUseCase(sl<INotificationsRepository>()),
  );
  sl.registerLazySingleton<MarkReadUseCase>(
    () => MarkReadUseCase(sl<INotificationsRepository>()),
  );
  sl.registerLazySingleton<MarkAllReadUseCase>(
    () => MarkAllReadUseCase(sl<INotificationsRepository>()),
  );
  sl.registerLazySingleton<DeleteNotificationUseCase>(
    () => DeleteNotificationUseCase(sl<INotificationsRepository>()),
  );

  // ── BLoCs (factories — instancia fresca por ruta) ─────────────────────────
  sl.registerFactory<CaptureBloc>(() => CaptureBloc(
        sl<UploadImageUseCase>(),
        sl<ImageCompressionService>(),
      ));

  sl.registerFactory<ResultsBloc>(
      () => ResultsBloc(sl<GetAnalysisUseCase>()));

  sl.registerFactory<HistoryBloc>(
      () => HistoryBloc(sl<GetAnalysisListUseCase>(), sl<WatchNotificationsUseCase>()));

  // ── Notifications — Bloc ───────────────────────────────────────────────────
  sl.registerSingleton<NotificationsBloc>(
    NotificationsBloc(
      getNotifications: sl<GetNotificationsUseCase>(),
      markRead: sl<MarkReadUseCase>(),
      markAllRead: sl<MarkAllReadUseCase>(),
      delete: sl<DeleteNotificationUseCase>(),
    ),
  );

  // ── Admin — Data Source ───────────────────────────────────────────────────
  sl.registerLazySingleton<RemoteAdminDatasource>(
    () => RemoteAdminDatasource(sl<Dio>()),
  );

  // ── Admin — Repository ────────────────────────────────────────────────────
  sl.registerLazySingleton<IAdminRepository>(
    () => AdminRepositoryImpl(sl<RemoteAdminDatasource>()),
  );

  // ── Admin — Use Cases ─────────────────────────────────────────────────────
  sl.registerLazySingleton<GetUsersUseCase>(
    () => GetUsersUseCase(sl<IAdminRepository>()),
  );
  sl.registerLazySingleton<UpdateUserRoleUseCase>(
    () => UpdateUserRoleUseCase(sl<IAdminRepository>()),
  );
  sl.registerLazySingleton<GetAdminStatsUseCase>(
    () => GetAdminStatsUseCase(sl<IAdminRepository>()),
  );
  sl.registerLazySingleton<CreateUserUseCase>(
    () => CreateUserUseCase(sl<IAdminRepository>()),
  );

  // ── Admin — Bloc (factory: instancia nueva por cada ShellRoute) ──────────
  sl.registerFactory<AdminBloc>(
    () => AdminBloc(
      getUsers: sl<GetUsersUseCase>(),
      updateRole: sl<UpdateUserRoleUseCase>(),
      getStats: sl<GetAdminStatsUseCase>(),
      createUser: sl<CreateUserUseCase>(),
    ),
  );

  sl.registerFactory<AdminDashboardBloc>(
    () => AdminDashboardBloc(repository: sl<IAdminRepository>()),
  );

  // ── Queue use cases ───────────────────────────────────────────────────────
  sl.registerLazySingleton<SyncPendingUploadsUseCase>(
      () => SyncPendingUploadsUseCase(sl<IOfflineQueueRepository>()));

  sl.registerLazySingleton<DeletePendingUploadUseCase>(
      () => DeletePendingUploadUseCase(sl<IOfflineQueueRepository>()));

  sl.registerLazySingleton<WatchPendingUploadsUseCase>(
      () => WatchPendingUploadsUseCase(sl<IOfflineQueueRepository>()));

  sl.registerLazySingleton<OfflineQueueBloc>(
    () => OfflineQueueBloc(
      watchUploads: sl<WatchPendingUploadsUseCase>(),
      deleteUpload: sl<DeletePendingUploadUseCase>(),
      syncService: sl<SyncService>(),
    ),
  );

  // ── Solicitudes ───────────────────────────────────────────────────────────
  sl.registerLazySingleton<RemoteSolicitudesDatasource>(
    () => RemoteSolicitudesDatasource(sl<Dio>()),
  );

  sl.registerLazySingleton<ISolicitudesRepository>(
    () => SolicitudesRepositoryImpl(sl<RemoteSolicitudesDatasource>()),
  );

  sl.registerLazySingleton<GetSolicitudesUseCase>(
    () => GetSolicitudesUseCase(sl<ISolicitudesRepository>()),
  );

  sl.registerLazySingleton<GetSolicitudByIdUseCase>(
    () => GetSolicitudByIdUseCase(sl<ISolicitudesRepository>()),
  );

  sl.registerLazySingleton<UpdateSolicitudEstadoUseCase>(
    () => UpdateSolicitudEstadoUseCase(sl<ISolicitudesRepository>()),
  );

  sl.registerFactory<SolicitudesBloc>(
    () => SolicitudesBloc(sl<GetSolicitudesUseCase>(), sl<WatchNotificationsUseCase>()),
  );

  sl.registerFactory<SolicitudDetailBloc>(
    () => SolicitudDetailBloc(sl<UpdateSolicitudEstadoUseCase>()),
  );

  // ── Inicializar sesión ────────────────────────────────────────────────────
  await sl<AuthCubit>().checkSession();
}
