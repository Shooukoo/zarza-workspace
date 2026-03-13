import 'dart:io';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/fruit_analysis.dart';
import '../../domain/usecases/upload_image_usecase.dart';

// Events
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

class CaptureUploadRequested extends CaptureEvent {
  const CaptureUploadRequested();
}

class CaptureClearEvent extends CaptureEvent {
  const CaptureClearEvent();
}

// States
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

class CaptureFailure extends CaptureState {
  const CaptureFailure(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

// BLoC
class CaptureBloc extends Bloc<CaptureEvent, CaptureState> {
  CaptureBloc(this._uploadImageUseCase) : super(const CaptureInitial()) {
    on<CaptureImageSelected>(_onImageSelected);
    on<CaptureUploadRequested>(_onUploadRequested);
    on<CaptureClearEvent>(_onClear);
  }

  final UploadImageUseCase _uploadImageUseCase;
  File? _selectedFile;

  void _onImageSelected(
    CaptureImageSelected event,
    Emitter<CaptureState> emit,
  ) {
    _selectedFile = event.file;
    emit(CaptureImageReady(event.file));
  }

  Future<void> _onUploadRequested(
    CaptureUploadRequested event,
    Emitter<CaptureState> emit,
  ) async {
    if (_selectedFile == null) return;
    emit(CaptureUploading(_selectedFile!));
    try {
      final result = await _uploadImageUseCase(_selectedFile!);
      emit(CaptureSuccess(result));
    } catch (e) {
      emit(CaptureFailure(_errorMessage(e)));
    }
  }

  void _onClear(CaptureClearEvent event, Emitter<CaptureState> emit) {
    _selectedFile = null;
    emit(const CaptureInitial());
  }

  String _errorMessage(Object e) {
    final msg = e.toString();
    if (msg.contains('SocketException') || msg.contains('Connection refused')) {
      return 'No se pudo conectar al servidor. ¿Está el backend en ejecución?';
    }
    if (msg.contains('413')) {
      return 'La imagen es demasiado grande.';
    }
    return 'Error al subir la imagen: $msg';
  }
}
