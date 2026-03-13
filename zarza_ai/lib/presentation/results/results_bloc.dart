import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/fruit_analysis.dart';
import '../../domain/usecases/get_analysis_usecase.dart';

// Events
abstract class ResultsEvent extends Equatable {
  const ResultsEvent();
  @override
  List<Object?> get props => [];
}

class ResultsLoadEvent extends ResultsEvent {
  const ResultsLoadEvent({required this.id});
  final String id;
  @override
  List<Object?> get props => [id];
}

// States
abstract class ResultsState extends Equatable {
  const ResultsState();
  @override
  List<Object?> get props => [];
}

class ResultsInitial extends ResultsState {
  const ResultsInitial();
}

class ResultsLoading extends ResultsState {
  const ResultsLoading();
}

class ResultsLoaded extends ResultsState {
  const ResultsLoaded(this.analysis);
  final FruitAnalysis analysis;
  @override
  List<Object?> get props => [analysis];
}

class ResultsError extends ResultsState {
  const ResultsError(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

// BLoC
class ResultsBloc extends Bloc<ResultsEvent, ResultsState> {
  ResultsBloc(this._getAnalysisUseCase) : super(const ResultsInitial()) {
    on<ResultsLoadEvent>(_onLoad);
  }

  final GetAnalysisUseCase _getAnalysisUseCase;

  Future<void> _onLoad(
    ResultsLoadEvent event,
    Emitter<ResultsState> emit,
  ) async {
    emit(const ResultsLoading());
    try {
      final analysis = await _getAnalysisUseCase(event.id);
      emit(ResultsLoaded(analysis));
    } catch (e) {
      emit(ResultsError('No se pudo cargar el análisis: ${e.toString()}'));
    }
  }
}
