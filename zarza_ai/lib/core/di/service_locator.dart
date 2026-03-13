import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';

import '../../core/constants/app_constants.dart';
// Data
import '../../data/datasources/remote_ingestion_datasource.dart';
import '../../data/datasources/remote_fruits_datasource.dart';
import '../../data/datasources/websocket_datasource.dart';
import '../../data/repositories/ingestion_repository_impl.dart';
import '../../data/repositories/fruits_repository_impl.dart';
import '../../data/repositories/notifications_repository_impl.dart';
// Domain
import '../../domain/repositories/i_ingestion_repository.dart';
import '../../domain/repositories/i_fruits_repository.dart';
import '../../domain/repositories/i_notifications_repository.dart';
import '../../domain/usecases/upload_image_usecase.dart';
import '../../domain/usecases/get_analysis_usecase.dart';
import '../../domain/usecases/watch_notifications_usecase.dart';
// Presentation
import '../../presentation/capture/capture_bloc.dart';
import '../../presentation/results/results_bloc.dart';
import '../../presentation/history/history_bloc.dart';

final sl = GetIt.instance;

Future<void> setupServiceLocator() async {
  // ── External ──────────────────────────────────────────────────────────────
  sl.registerLazySingleton<Dio>(() => Dio(
        BaseOptions(
          baseUrl: AppConstants.baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: AppConstants.uploadTimeoutSeconds),
          headers: {'Accept': 'application/json'},
        ),
      ));

  // ── Data Sources ──────────────────────────────────────────────────────────
  sl.registerLazySingleton<WebSocketDatasource>(() => WebSocketDatasource());

  sl.registerLazySingleton<RemoteIngestionDatasource>(
      () => RemoteIngestionDatasource(sl<Dio>()));

  sl.registerLazySingleton<RemoteFruitsDatasource>(
      () => RemoteFruitsDatasource(sl<Dio>()));

  // ── Repositories ──────────────────────────────────────────────────────────
  sl.registerLazySingleton<IIngestionRepository>(
      () => IngestionRepositoryImpl(sl<RemoteIngestionDatasource>()));

  sl.registerLazySingleton<IFruitsRepository>(
      () => FruitsRepositoryImpl(sl<RemoteFruitsDatasource>()));

  sl.registerLazySingleton<INotificationsRepository>(
      () => NotificationsRepositoryImpl(sl<WebSocketDatasource>()));

  // ── Use Cases ─────────────────────────────────────────────────────────────
  sl.registerLazySingleton<UploadImageUseCase>(
      () => UploadImageUseCase(sl<IIngestionRepository>()));

  sl.registerLazySingleton<GetAnalysisUseCase>(
      () => GetAnalysisUseCase(sl<IFruitsRepository>()));

  sl.registerLazySingleton<GetAnalysisListUseCase>(
      () => GetAnalysisListUseCase(sl<IFruitsRepository>()));

  sl.registerLazySingleton<WatchNotificationsUseCase>(
      () => WatchNotificationsUseCase(sl<INotificationsRepository>()));

  // ── BLoCs (factories so each route gets fresh instance) ───────────────────
  sl.registerFactory<CaptureBloc>(
      () => CaptureBloc(sl<UploadImageUseCase>()));

  sl.registerFactory<ResultsBloc>(
      () => ResultsBloc(sl<GetAnalysisUseCase>()));

  sl.registerFactory<HistoryBloc>(
      () => HistoryBloc(sl<GetAnalysisListUseCase>()));
}
