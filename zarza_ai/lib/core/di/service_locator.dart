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
// Admin — Data
import '../../data/datasources/remote_admin_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/ingestion_repository_impl.dart';
import '../../data/repositories/fruits_repository_impl.dart';
import '../../data/repositories/notifications_repository_impl.dart';
import '../../data/repositories/admin_repository_impl.dart';
// Domain
import '../../domain/repositories/i_auth_repository.dart';
import '../../domain/repositories/i_ingestion_repository.dart';
import '../../domain/repositories/i_fruits_repository.dart';
import '../../domain/repositories/i_notifications_repository.dart';
import '../../domain/repositories/i_admin_repository.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/register_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../domain/usecases/upload_image_usecase.dart';
import '../../domain/usecases/get_analysis_usecase.dart';
import '../../domain/usecases/watch_notifications_usecase.dart';
import '../../domain/usecases/get_users_usecase.dart';
import '../../domain/usecases/update_user_role_usecase.dart';
import '../../domain/usecases/get_admin_stats_usecase.dart';
import '../../domain/usecases/create_user_usecase.dart';
// Presentation
import '../../presentation/capture/capture_bloc.dart';
import '../../presentation/results/results_bloc.dart';
import '../../presentation/history/history_bloc.dart';
import '../../presentation/admin/admin_blocs/admin_bloc.dart';
import '../../presentation/admin/admin_blocs/admin_dashboard_bloc.dart';

final sl = GetIt.instance;

Future<void> setupServiceLocator() async {
  // ── External ───────────────────────────────────────────────────────────────
  sl.registerLazySingleton<LocalNotificationsService>(
    () => LocalNotificationsService(),
  );
  await sl<LocalNotificationsService>().init();

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

  // ── Auth Cubit (singleton global) ─────────────────────────────────────────
  sl.registerLazySingleton<AuthCubit>(
    () => AuthCubit(
      loginUseCase: sl<LoginUseCase>(),
      registerUseCase: sl<RegisterUseCase>(),
      logoutUseCase: sl<LogoutUseCase>(),
      getCurrentUserUseCase: sl<GetCurrentUserUseCase>(),
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

  // ── Repositories (existentes) ──────────────────────────────────────────────
  sl.registerLazySingleton<IIngestionRepository>(
      () => IngestionRepositoryImpl(sl<RemoteIngestionDatasource>()));

  sl.registerLazySingleton<IFruitsRepository>(
      () => FruitsRepositoryImpl(sl<RemoteFruitsDatasource>()));

  sl.registerLazySingleton<INotificationsRepository>(
      () => NotificationsRepositoryImpl(sl<WebSocketDatasource>()));

  // ── Use Cases (existentes) ─────────────────────────────────────────────────
  sl.registerLazySingleton<UploadImageUseCase>(
      () => UploadImageUseCase(sl<IIngestionRepository>()));

  sl.registerLazySingleton<GetAnalysisUseCase>(
      () => GetAnalysisUseCase(sl<IFruitsRepository>()));

  sl.registerLazySingleton<GetAnalysisListUseCase>(
      () => GetAnalysisListUseCase(sl<IFruitsRepository>()));

  sl.registerLazySingleton<WatchNotificationsUseCase>(
      () => WatchNotificationsUseCase(sl<INotificationsRepository>()));

  // ── BLoCs (factories — instancia fresca por ruta) ─────────────────────────
  sl.registerFactory<CaptureBloc>(() => CaptureBloc(sl<UploadImageUseCase>()));

  sl.registerFactory<ResultsBloc>(
      () => ResultsBloc(sl<GetAnalysisUseCase>()));

  sl.registerFactory<HistoryBloc>(
      () => HistoryBloc(sl<GetAnalysisListUseCase>()));

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

  // ── Inicializar sesión ────────────────────────────────────────────────────
  await sl<AuthCubit>().checkSession();
}
