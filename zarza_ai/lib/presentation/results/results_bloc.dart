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
  const ResultsLoadEvent({
    required this.id,
    this.analysis,
  });

  final String id;
  final FruitAnalysis? analysis;

  @override
  List<Object?> get props => [id, analysis];
}

class ResultsValidateEvent extends ResultsEvent {
  const ResultsValidateEvent({
    required this.id,
    required this.action,
    this.cronogramaCorregido,
    this.observaciones,
  });

  final String id;
  final String action;
  final List<Map<String, dynamic>>? cronogramaCorregido;
  final String? observaciones;

  @override
  List<Object?> get props => [
        id,
        action,
        cronogramaCorregido,
        observaciones,
      ];
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

class ResultsValidating extends ResultsState {
  const ResultsValidating(this.analysis);

  final FruitAnalysis analysis;

  @override
  List<Object?> get props => [analysis];
}

class ResultsValidated extends ResultsState {
  const ResultsValidated(this.analysis);

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

class ResultsValidationError extends ResultsState {
  const ResultsValidationError({
    required this.analysis,
    required this.message,
  });

  final FruitAnalysis analysis;
  final String message;

  @override
  List<Object?> get props => [analysis, message];
}
// BLoC
class ResultsBloc extends Bloc<ResultsEvent, ResultsState> {
  ResultsBloc(
    this._getAnalysisUseCase,
    this._validateAnalysisUseCase,
  ) : super(const ResultsInitial()) {
    on<ResultsLoadEvent>(_onLoad);
    on<ResultsValidateEvent>(_onValidate);
  }

  final GetAnalysisUseCase _getAnalysisUseCase;
  final ValidateAnalysisUseCase _validateAnalysisUseCase;

  Future<void> _onLoad(
    ResultsLoadEvent event,
    Emitter<ResultsState> emit,
  ) async {
    emit(const ResultsLoading());

    if (event.analysis != null) {
      emit(ResultsLoaded(event.analysis!));
      return;
    }
    
    // Analysis is processed asynchronously — retry for up to 90 s
    const maxAttempts = 9;
    const retryDelay = Duration(seconds: 10);
    for (var attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        final analysis = await _getAnalysisUseCase(event.id);
        emit(ResultsLoaded(analysis));
        return;
      } on Object {
        if (attempt < maxAttempts) {
          await Future<void>.delayed(retryDelay);
        }
      }
    }
    emit(const ResultsError('El análisis tardó demasiado. Intenta verlo en tu historial.'));
  }

  Future<void> _onValidate(
    ResultsValidateEvent event,
    Emitter<ResultsState> emit,
  ) async {
    final currentState = state;

    if (currentState is! ResultsLoaded &&
        currentState is! ResultsValidated &&
        currentState is! ResultsValidationError) {
      return;
    }

    final analysis = currentState is ResultsLoaded
        ? currentState.analysis
        : currentState is ResultsValidated
            ? currentState.analysis
            : (currentState as ResultsValidationError).analysis;

    emit(ResultsValidating(analysis));

    try {
      final updated = await _validateAnalysisUseCase(
        id: event.id,
        action: event.action,
        cronogramaCorregido: event.cronogramaCorregido,
        observaciones: event.observaciones,
      );

      final validationStatus = event.action == 'validado'
          ? AnalysisValidationStatus.validado
          : AnalysisValidationStatus.rechazado;

      final validatedAnalysis = updated.copyWith(
        validationStatus: validationStatus,
      );

      emit(ResultsValidated(validatedAnalysis));
    } on Object catch (e) {
      emit(ResultsValidationError(
        analysis: analysis,
        message: 'No se pudo validar el análisis: ${e.toString()}',
      ));
    }
  }
}
