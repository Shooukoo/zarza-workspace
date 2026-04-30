import 'dart:async';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/services/sync_service.dart';
import '../../domain/entities/pending_upload.dart';
import '../../domain/usecases/delete_pending_upload_usecase.dart';
import '../../domain/usecases/watch_pending_uploads_usecase.dart';

// ── Events ────────────────────────────────────────────────────────────────────

abstract class OfflineQueueEvent extends Equatable {
  const OfflineQueueEvent();
  @override
  List<Object?> get props => [];
}

class QueueStartWatching extends OfflineQueueEvent {
  const QueueStartWatching();
}

class QueueUpdated extends OfflineQueueEvent {
  const QueueUpdated(this.items);
  final List<PendingUpload> items;
  @override
  List<Object?> get props => [items];
}

class QueueItemDeleted extends OfflineQueueEvent {
  const QueueItemDeleted(this.offlineSyncId);
  final String offlineSyncId;
  @override
  List<Object?> get props => [offlineSyncId];
}

class QueueSyncRequested extends OfflineQueueEvent {
  const QueueSyncRequested();
}

// ── State ─────────────────────────────────────────────────────────────────────

class OfflineQueueState extends Equatable {
  const OfflineQueueState({
    this.items = const [],
    this.isSyncing = false,
  });

  final List<PendingUpload> items;
  final bool isSyncing;

  OfflineQueueState copyWith({List<PendingUpload>? items, bool? isSyncing}) =>
      OfflineQueueState(
        items: items ?? this.items,
        isSyncing: isSyncing ?? this.isSyncing,
      );

  @override
  List<Object?> get props => [items, isSyncing];
}

// ── BLoC ──────────────────────────────────────────────────────────────────────

class OfflineQueueBloc extends Bloc<OfflineQueueEvent, OfflineQueueState> {
  OfflineQueueBloc({
    required WatchPendingUploadsUseCase watchUploads,
    required DeletePendingUploadUseCase deleteUpload,
    required SyncService syncService,
  })  : _watchUploads = watchUploads,
        _deleteUpload = deleteUpload,
        _syncService = syncService,
        super(const OfflineQueueState()) {
    on<QueueStartWatching>(_onStartWatching);
    on<QueueUpdated>(_onQueueUpdated);
    on<QueueItemDeleted>(_onItemDeleted);
    on<QueueSyncRequested>(_onSyncRequested);
  }

  final WatchPendingUploadsUseCase _watchUploads;
  final DeletePendingUploadUseCase _deleteUpload;
  final SyncService _syncService;
  StreamSubscription<List<PendingUpload>>? _sub;

  void _onStartWatching(QueueStartWatching event, Emitter<OfflineQueueState> emit) {
    _sub?.cancel();
    _sub = _watchUploads().listen(
      (items) => add(QueueUpdated(items)),
    );
  }

  void _onQueueUpdated(QueueUpdated event, Emitter<OfflineQueueState> emit) {
    emit(state.copyWith(items: event.items));
  }

  Future<void> _onItemDeleted(
      QueueItemDeleted event, Emitter<OfflineQueueState> emit) async {
    await _deleteUpload(event.offlineSyncId);
  }

  Future<void> _onSyncRequested(
      QueueSyncRequested event, Emitter<OfflineQueueState> emit) async {
    emit(state.copyWith(isSyncing: true));
    await _syncService.syncPending();
    emit(state.copyWith(isSyncing: false));
  }

  @override
  Future<void> close() {
    _sub?.cancel();
    return super.close();
  }
}
