import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/app_constants.dart';
import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import '../../domain/usecases/get_solicitudes_usecase.dart';

// ── Events ────────────────────────────────────────────────────────────────────

abstract class SolicitudesEvent extends Equatable {
  const SolicitudesEvent();
  @override
  List<Object?> get props => [];
}

class SolicitudesLoad extends SolicitudesEvent {
  const SolicitudesLoad({this.estado});
  final EstadoSolicitud? estado;
  @override
  List<Object?> get props => [estado];
}

class SolicitudesLoadMore extends SolicitudesEvent {
  const SolicitudesLoadMore();
}

class SolicitudUpdateEstado extends SolicitudesEvent {
  const SolicitudUpdateEstado({required this.id, required this.estado});
  final String id;
  final EstadoSolicitud estado;
  @override
  List<Object?> get props => [id, estado];
}

// ── States ────────────────────────────────────────────────────────────────────

abstract class SolicitudesState extends Equatable {
  const SolicitudesState();
  @override
  List<Object?> get props => [];
}

class SolicitudesInitial extends SolicitudesState {
  const SolicitudesInitial();
}

class SolicitudesLoading extends SolicitudesState {
  const SolicitudesLoading();
}

class SolicitudesLoaded extends SolicitudesState {
  const SolicitudesLoaded({
    required this.items,
    this.hasMore = false,
    this.page = 1,
  });
  final List<SolicitudEntity> items;
  final bool hasMore;
  final int page;
  @override
  List<Object?> get props => [items, hasMore, page];
}

class SolicitudesLoadingMore extends SolicitudesState {
  const SolicitudesLoadingMore(this.current);
  final List<SolicitudEntity> current;
  @override
  List<Object?> get props => [current];
}

class SolicitudesError extends SolicitudesState {
  const SolicitudesError(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

// ── BLoC ──────────────────────────────────────────────────────────────────────

class SolicitudesBloc extends Bloc<SolicitudesEvent, SolicitudesState> {
  SolicitudesBloc(this._getSolicitudesUseCase) : super(const SolicitudesInitial()) {
    on<SolicitudesLoad>(_onLoad);
    on<SolicitudesLoadMore>(_onLoadMore);
    on<SolicitudUpdateEstado>(_onUpdateEstado);
  }

  final GetSolicitudesUseCase _getSolicitudesUseCase;
  int _currentPage = 1;
  final List<SolicitudEntity> _items = [];
  EstadoSolicitud? _currentEstado;

  Future<void> _onLoad(
    SolicitudesLoad event,
    Emitter<SolicitudesState> emit,
  ) async {
    emit(const SolicitudesLoading());
    _currentPage = 1;
    _items.clear();
    _currentEstado = event.estado;

    try {
      final result = await _getSolicitudesUseCase(
        page: _currentPage,
        limit: AppConstants.defaultPageSize,
        estado: _currentEstado,
      );
      _items.addAll(result);
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: result.length == AppConstants.defaultPageSize,
        page: _currentPage,
      ));
    } catch (e) {
      emit(SolicitudesError('No se pudieron cargar las solicitudes: ${e.toString()}'));
    }
  }

  Future<void> _onLoadMore(
    SolicitudesLoadMore event,
    Emitter<SolicitudesState> emit,
  ) async {
    if (state is! SolicitudesLoaded) return;
    emit(SolicitudesLoadingMore(List.unmodifiable(_items)));
    try {
      _currentPage++;
      final result = await _getSolicitudesUseCase(
        page: _currentPage,
        limit: AppConstants.defaultPageSize,
        estado: _currentEstado,
      );
      _items.addAll(result);
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: result.length == AppConstants.defaultPageSize,
        page: _currentPage,
      ));
    } catch (e) {
      _currentPage--;
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: false,
        page: _currentPage,
      ));
    }
  }

  void _onUpdateEstado(
    SolicitudUpdateEstado event,
    Emitter<SolicitudesState> emit,
  ) {
    final index = _items.indexWhere((s) => s.id == event.id);
    if (index == -1) return;
    _items[index] = _items[index].copyWith(estado: event.estado);
    final current = state;
    if (current is SolicitudesLoaded) {
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: current.hasMore,
        page: current.page,
      ));
    }
  }
}
