import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import '../../domain/usecases/update_solicitud_estado_usecase.dart';

// ── Events ────────────────────────────────────────────────────────────────────

abstract class SolicitudDetailEvent extends Equatable {
  const SolicitudDetailEvent();
  @override
  List<Object?> get props => [];
}

class SolicitudDetailLoad extends SolicitudDetailEvent {
  const SolicitudDetailLoad(this.solicitud);
  final SolicitudEntity solicitud;
  @override
  List<Object?> get props => [solicitud];
}

class SolicitudDetailMarcarEnProgreso extends SolicitudDetailEvent {
  const SolicitudDetailMarcarEnProgreso();
}

class SolicitudDetailCompletar extends SolicitudDetailEvent {
  const SolicitudDetailCompletar();
}

// ── States ────────────────────────────────────────────────────────────────────

abstract class SolicitudDetailState extends Equatable {
  const SolicitudDetailState();
  @override
  List<Object?> get props => [];
}

class SolicitudDetailInitial extends SolicitudDetailState {
  const SolicitudDetailInitial();
}

class SolicitudDetailLoaded extends SolicitudDetailState {
  const SolicitudDetailLoaded(this.solicitud);
  final SolicitudEntity solicitud;
  @override
  List<Object?> get props => [solicitud];
}

class SolicitudDetailUpdating extends SolicitudDetailState {
  const SolicitudDetailUpdating(this.solicitud);
  final SolicitudEntity solicitud;
  @override
  List<Object?> get props => [solicitud];
}

class SolicitudDetailEstadoActualizado extends SolicitudDetailState {
  const SolicitudDetailEstadoActualizado(this.solicitud);
  final SolicitudEntity solicitud;
  @override
  List<Object?> get props => [solicitud];
}

class SolicitudDetailError extends SolicitudDetailState {
  const SolicitudDetailError({required this.solicitud, required this.message});
  final SolicitudEntity solicitud;
  final String message;
  @override
  List<Object?> get props => [solicitud, message];
}

// ── BLoC ──────────────────────────────────────────────────────────────────────

class SolicitudDetailBloc
    extends Bloc<SolicitudDetailEvent, SolicitudDetailState> {
  SolicitudDetailBloc(this._updateEstadoUseCase)
      : super(const SolicitudDetailInitial()) {
    on<SolicitudDetailLoad>(_onLoad);
    on<SolicitudDetailMarcarEnProgreso>(_onMarcarEnProgreso);
    on<SolicitudDetailCompletar>(_onCompletar);
  }

  final UpdateSolicitudEstadoUseCase _updateEstadoUseCase;
  SolicitudEntity? _current;

  void _onLoad(SolicitudDetailLoad event, Emitter<SolicitudDetailState> emit) {
    _current = event.solicitud;
    emit(SolicitudDetailLoaded(event.solicitud));
  }

  Future<void> _onMarcarEnProgreso(
    SolicitudDetailMarcarEnProgreso event,
    Emitter<SolicitudDetailState> emit,
  ) async {
    if (_current == null) return;
    emit(SolicitudDetailUpdating(_current!));
    try {
      final updated =
          await _updateEstadoUseCase(_current!.id, EstadoSolicitud.EN_PROGRESO);
      _current = _current!.copyWith(estado: updated.estado);
      emit(SolicitudDetailEstadoActualizado(_current!));
    } catch (e) {
      emit(SolicitudDetailError(
        solicitud: _current!,
        message: 'No se pudo actualizar: ${e.toString()}',
      ));
    }
  }

  Future<void> _onCompletar(
    SolicitudDetailCompletar event,
    Emitter<SolicitudDetailState> emit,
  ) async {
    if (_current == null) return;
    emit(SolicitudDetailUpdating(_current!));
    try {
      final updated =
          await _updateEstadoUseCase(_current!.id, EstadoSolicitud.COMPLETADO);
      _current = _current!.copyWith(estado: updated.estado);
      emit(SolicitudDetailEstadoActualizado(_current!));
    } catch (e) {
      emit(SolicitudDetailError(
        solicitud: _current!,
        message: 'No se pudo completar: ${e.toString()}',
      ));
    }
  }
}
