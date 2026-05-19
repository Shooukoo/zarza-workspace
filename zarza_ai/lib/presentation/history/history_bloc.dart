import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/app_constants.dart';
import '../../core/constants/ws_events.dart';
import '../../domain/entities/fruit_analysis.dart';
import '../../domain/usecases/get_analysis_usecase.dart';
import '../../domain/usecases/watch_notifications_usecase.dart';

// Events
abstract class HistoryEvent extends Equatable {
  const HistoryEvent();
  @override
  List<Object?> get props => [];
}

class HistoryLoadEvent extends HistoryEvent {
  const HistoryLoadEvent({
    this.page = 1,
    this.userId,
    this.startDate,
    this.endDate,
  });
  final int page;
  final String? userId;
  final DateTime? startDate;
  final DateTime? endDate;
  @override
  List<Object?> get props => [page, userId, startDate, endDate];
}

class HistoryLoadMoreEvent extends HistoryEvent {
  const HistoryLoadMoreEvent();
}

class _HistorySilentRefresh extends HistoryEvent {
  const _HistorySilentRefresh();
}

class GetAnalysesEvent extends HistoryEvent {
  const GetAnalysesEvent();
}

// States
abstract class HistoryState extends Equatable {
  const HistoryState();
  @override
  List<Object?> get props => [];
}

class HistoryInitial extends HistoryState {
  const HistoryInitial();
}

class HistoryLoading extends HistoryState {
  const HistoryLoading();
}

class HistoryLoaded extends HistoryState {
  const HistoryLoaded({
    required this.analyses,
    this.hasMore = false,
    this.page = 1,
  });
  final List<FruitAnalysis> analyses;
  final bool hasMore;
  final int page;
  @override
  List<Object?> get props => [analyses, hasMore, page];
}

class HistoryLoadingMore extends HistoryState {
  const HistoryLoadingMore(this.current);
  final List<FruitAnalysis> current;
  @override
  List<Object?> get props => [current];
}

class HistoryError extends HistoryState {
  const HistoryError(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

// BLoC
class HistoryBloc extends Bloc<HistoryEvent, HistoryState> {
  HistoryBloc(this._getListUseCase, this._watchNotifications)
      : super(const HistoryInitial()) {
    on<HistoryLoadEvent>(_onLoad);
    on<HistoryLoadMoreEvent>(_onLoadMore);
    on<_HistorySilentRefresh>(_onSilentRefresh);
    on<GetAnalysesEvent>(_onGetAnalyses);

    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      add(const _HistorySilentRefresh());
    });

    _wsSub = _watchNotifications.call().listen((raw) {
      try {
        final map = jsonDecode(raw) as Map<String, dynamic>;
        final event = map['event'] as String?;
        if (event == WsEvents.analisisListo || event == WsEvents.analysisValidated) {
          add(const _HistorySilentRefresh());
        }
      } catch (_) {}
    });
  }

  final GetAnalysisListUseCase _getListUseCase;
  final WatchNotificationsUseCase _watchNotifications;
  int _currentPage = 1;
  final List<FruitAnalysis> _items = [];
  String? _currentUserId;
  DateTime? _currentStartDate;
  DateTime? _currentEndDate;
  Timer? _timer;
  StreamSubscription<String>? _wsSub;

  Future<void> _onLoad(
    HistoryLoadEvent event,
    Emitter<HistoryState> emit,
  ) async {
    emit(const HistoryLoading());
    _currentPage = 1;
    _items.clear();
    _currentUserId = event.userId;
    _currentStartDate = event.startDate;
    _currentEndDate = event.endDate;

    try {
      final result = await _getListUseCase(
        page: _currentPage,
        limit: AppConstants.defaultPageSize,
        userId: _currentUserId,
        startDate: _currentStartDate?.toIso8601String(),
        endDate: _currentEndDate?.toIso8601String(),
      );
      _items.addAll(result);
      emit(HistoryLoaded(
        analyses: List.unmodifiable(_items),
        hasMore: result.length == AppConstants.defaultPageSize,
        page: _currentPage,
      ));
    } catch (e) {
      emit(HistoryError('No se pudo cargar el historial: ${e.toString()}'));
    }
  }

  Future<void> _onLoadMore(
    HistoryLoadMoreEvent event,
    Emitter<HistoryState> emit,
  ) async {
    if (state is! HistoryLoaded) return;
    emit(HistoryLoadingMore(_items));
    try {
      _currentPage++;
      final result = await _getListUseCase(
        page: _currentPage,
        limit: AppConstants.defaultPageSize,
        userId: _currentUserId,
        startDate: _currentStartDate?.toIso8601String(),
        endDate: _currentEndDate?.toIso8601String(),
      );
      _items.addAll(result);
      emit(HistoryLoaded(
        analyses: List.unmodifiable(_items),
        hasMore: result.length == AppConstants.defaultPageSize,
        page: _currentPage,
      ));
    } catch (e) {
      _currentPage--;
      emit(HistoryLoaded(
        analyses: List.unmodifiable(_items),
        hasMore: false,
        page: _currentPage,
      ));
    }
  }

  Future<void> _onSilentRefresh(
    _HistorySilentRefresh event,
    Emitter<HistoryState> emit,
  ) async {
    // Only refresh if already loaded — don't interrupt loading states
    if (state is! HistoryLoaded) return;
    try {
      final result = await _getListUseCase(
        page: 1,
        limit: AppConstants.defaultPageSize,
        userId: _currentUserId,
        startDate: _currentStartDate?.toIso8601String(),
        endDate: _currentEndDate?.toIso8601String(),
      );
      if (result.isEmpty) return;
      _currentPage = 1;
      _items
        ..clear()
        ..addAll(result);
      emit(HistoryLoaded(
        analyses: List.unmodifiable(_items),
        hasMore: result.length == AppConstants.defaultPageSize,
        page: _currentPage,
      ));
    } catch (e, stack) {
      developer.log('[HistoryBloc] silent refresh failed', error: e, stackTrace: stack);
    }
  }

  Future<void> _onGetAnalyses(
    GetAnalysesEvent event,
    Emitter<HistoryState> emit,
  ) async {
    add(HistoryLoadEvent(
      page: 1,
      userId: _currentUserId,
      startDate: _currentStartDate,
      endDate: _currentEndDate,
    ));
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    _wsSub?.cancel();
    return super.close();
  }
}
