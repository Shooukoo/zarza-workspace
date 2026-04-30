import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/fruit_analysis.dart';
import '../../domain/usecases/get_analysis_usecase.dart';
import '../../core/constants/app_constants.dart';

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
  HistoryBloc(this._getListUseCase) : super(const HistoryInitial()) {
    on<HistoryLoadEvent>(_onLoad);
    on<HistoryLoadMoreEvent>(_onLoadMore);
  }

  final GetAnalysisListUseCase _getListUseCase;
  int _currentPage = 1;
  final List<FruitAnalysis> _items = [];
  
  // Filter state preservation
  String? _currentUserId;
  DateTime? _currentStartDate;
  DateTime? _currentEndDate;

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
      // Restaurar el estado cargado para no perder los items ya mostrados
      emit(HistoryLoaded(
        analyses: List.unmodifiable(_items),
        hasMore: false,
        page: _currentPage,
      ));
    }
  }
}
