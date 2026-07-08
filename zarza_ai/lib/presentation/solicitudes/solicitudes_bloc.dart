import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/app_constants.dart';
import '../../core/constants/ws_events.dart';
import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import '../../domain/usecases/get_solicitudes_usecase.dart';
import '../../domain/usecases/watch_notifications_usecase.dart';

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

class _SolicitudesSilentRefresh extends SolicitudesEvent {
  const _SolicitudesSilentRefresh();
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
  SolicitudesBloc(this._getSolicitudesUseCase, this._watchNotifications)
      : super(const SolicitudesInitial()) {
    on<SolicitudesLoad>(_onLoad);
    on<SolicitudesLoadMore>(_onLoadMore);
    on<SolicitudUpdateEstado>(_onUpdateEstado);
    on<_SolicitudesSilentRefresh>(_onSilentRefresh);

    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      add(const _SolicitudesSilentRefresh());
    });

    _wsSub = _watchNotifications.call().listen((raw) {
      try {
        final map = jsonDecode(raw) as Map<String, dynamic>;
        final event = map['event'] as String?;
        if (event == WsEvents.nuevaSolicitud) {
          add(const _SolicitudesSilentRefresh());
        }
      } on Object {
        // Ignore malformed WebSocket messages
      }
    });
  }

  final GetSolicitudesUseCase _getSolicitudesUseCase;
  final WatchNotificationsUseCase _watchNotifications;
  int _currentPage = 1;
  final List<SolicitudEntity> _items = [];
  EstadoSolicitud? _currentEstado;
  Timer? _timer;
  StreamSubscription<String>? _wsSub;

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
      _items.addAll(result.items);
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: result.hasMore,
        page: _currentPage,
      ));
    } on Object catch (e) {
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
      _items.addAll(result.items);
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: result.hasMore,
        page: _currentPage,
      ));
    } on Object catch (_) {
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

  Future<void> _onSilentRefresh(
    _SolicitudesSilentRefresh event,
    Emitter<SolicitudesState> emit,
  ) async {
    if (state is! SolicitudesLoaded) return;
    try {
      final result = await _getSolicitudesUseCase(
        page: 1,
        limit: AppConstants.defaultPageSize,
        estado: _currentEstado,
      );
      if (result.items.isEmpty) return;
      _currentPage = 1;
      _items
        ..clear()
        ..addAll(result.items);
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: result.hasMore,
        page: _currentPage,
      ));
    } on Object catch (e, stack) {
      developer.log('[SolicitudesBloc] silent refresh failed', error: e, stackTrace: stack);
    }
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    _wsSub?.cancel();
    return super.close();
  }
}
