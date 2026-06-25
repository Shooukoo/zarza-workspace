import 'dart:developer' as developer;
import 'dart:io';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';

import '../../domain/entities/fruit_analysis.dart';
import '../../domain/entities/upload_metadata.dart';
import '../../domain/usecases/upload_image_usecase.dart';
import '../../core/services/image_compression_service.dart';

// ── Events ────────────────────────────────────────────────────────────────────

abstract class CaptureEvent extends Equatable {
  const CaptureEvent();
  @override
  List<Object?> get props => [];
}

class CaptureImageSelected extends CaptureEvent {
  const CaptureImageSelected(this.file);
  final File file;
  @override
  List<Object?> get props => [file.path];
}

class CaptureMetadataUpdated extends CaptureEvent {
  const CaptureMetadataUpdated({
    required this.campoId,
    this.gpsLat,
    this.gpsLon,
  });
  final String campoId;
  final double? gpsLat;
  final double? gpsLon;
  @override
  List<Object?> get props => [campoId, gpsLat, gpsLon];
}

class CaptureUploadRequested extends CaptureEvent {
  const CaptureUploadRequested();
}

class CaptureClearEvent extends CaptureEvent {
  const CaptureClearEvent();
}

// ── States ────────────────────────────────────────────────────────────────────

abstract class CaptureState extends Equatable {
  const CaptureState();
  @override
  List<Object?> get props => [];
}

class CaptureInitial extends CaptureState {
  const CaptureInitial();
}

class CaptureImageReady extends CaptureState {
  const CaptureImageReady(this.file);
  final File file;
  @override
  List<Object?> get props => [file.path];
}

class CaptureMetadataReady extends CaptureState {
  const CaptureMetadataReady({
    required this.file,
    required this.campoId,
    this.gpsLat,
    this.gpsLon,
  });
  final File file;
  final String campoId;
  final double? gpsLat;
  final double? gpsLon;
  @override
  List<Object?> get props => [file.path, campoId];
}

class CaptureUploading extends CaptureState {
  const CaptureUploading(this.file);
  final File file;
  @override
  List<Object?> get props => [file.path];
}

class CaptureSuccess extends CaptureState {
  const CaptureSuccess(this.result);
  final UploadResult result;
  @override
  List<Object?> get props => [result];
}

class CaptureQueued extends CaptureState {
  const CaptureQueued(this.offlineSyncId);
  final String offlineSyncId;
  @override
  List<Object?> get props => [offlineSyncId];
}

class CaptureFailure extends CaptureState {
  const CaptureFailure(this.message, {this.file});
  final String message;
  final File? file;
  @override
  List<Object?> get props => [message, file?.path];
}

// ── BLoC ──────────────────────────────────────────────────────────────────────

class CaptureBloc extends Bloc<CaptureEvent, CaptureState> {
  CaptureBloc(this._uploadImageUseCase, this._compressionService)
      : super(const CaptureInitial()) {
    on<CaptureImageSelected>(_onImageSelected);
    on<CaptureMetadataUpdated>(_onMetadataUpdated);
    on<CaptureUploadRequested>(_onUploadRequested);
    on<CaptureClearEvent>(_onClear);
  }

  final UploadImageUseCase _uploadImageUseCase;
  final ImageCompressionService _compressionService;
  static const _uuid = Uuid();

  Future<void> _onImageSelected(
    CaptureImageSelected event,
    Emitter<CaptureState> emit,
  ) async {
    try {
      final compressed = await _compressionService.compress(event.file);
      emit(CaptureImageReady(compressed));
    } on Object catch (e, stack) {
      developer.log('[CaptureBloc] compression failed', error: e, stackTrace: stack);
      emit(const CaptureFailure('No se pudo procesar la imagen.'));
    }
  }

  void _onMetadataUpdated(CaptureMetadataUpdated event, Emitter<CaptureState> emit) {
    File? file;
    if (state is CaptureImageReady) {
      file = (state as CaptureImageReady).file;
    } else if (state is CaptureMetadataReady) {
      file = (state as CaptureMetadataReady).file;
    }
    if (file == null) return;
    emit(CaptureMetadataReady(
      file: file,
      campoId: event.campoId,
      gpsLat: event.gpsLat,
      gpsLon: event.gpsLon,
    ));
  }

  Future<void> _onUploadRequested(
    CaptureUploadRequested event,
    Emitter<CaptureState> emit,
  ) async {
    if (state is! CaptureMetadataReady) return;
    final current = state as CaptureMetadataReady;
    emit(CaptureUploading(current.file));

    final metadata = UploadMetadata(
      campoId: current.campoId,
      capturedAt: DateTime.now(),
      offlineSyncId: _uuid.v4(),
      gpsLat: current.gpsLat,
      gpsLon: current.gpsLon,
    );

    try {
      final result = await _uploadImageUseCase(current.file, metadata);
      if (result.status == 'QUEUED') {
        emit(CaptureQueued(result.imageId));
      } else {
        if (await current.file.exists()) await current.file.delete();
        emit(CaptureSuccess(result));
      }
    } on Object catch (e, stack) {
      developer.log('[CaptureBloc] upload failed', error: e, stackTrace: stack);
      emit(CaptureFailure(_errorMessage(e), file: current.file));
    }
  }

  void _onClear(CaptureClearEvent event, Emitter<CaptureState> emit) {
    emit(const CaptureInitial());
  }

  String _errorMessage(Object e) {
    final msg = e.toString();
    if (msg.contains('SocketException') || msg.contains('Connection refused')) {
      return 'No se pudo conectar al servidor. Verifica tu conexión.';
    }
    if (msg.contains('413')) return 'La imagen es demasiado grande.';
    return 'Error al subir la imagen. Intenta de nuevo.';
  }
}
