import 'package:equatable/equatable.dart';

enum PendingUploadStatus { pending, syncing, failed }

class PendingUpload extends Equatable {
  const PendingUpload({
    required this.offlineSyncId,
    required this.imagePath,
    required this.campoId,
    required this.capturedAt,
    required this.queuedAt,
    required this.status,
    this.gpsLat,
    this.gpsLon,
    this.retryCount = 0,
    this.lastError,
  });

  final String offlineSyncId;
  final String imagePath;
  final String campoId;
  final DateTime capturedAt;
  final DateTime queuedAt;
  final PendingUploadStatus status;
  final double? gpsLat;
  final double? gpsLon;
  final int retryCount;
  final String? lastError;

  PendingUpload copyWith({
    PendingUploadStatus? status,
    int? retryCount,
    String? lastError,
  }) {
    return PendingUpload(
      offlineSyncId: offlineSyncId,
      imagePath: imagePath,
      campoId: campoId,
      capturedAt: capturedAt,
      queuedAt: queuedAt,
      status: status ?? this.status,
      gpsLat: gpsLat,
      gpsLon: gpsLon,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
    );
  }

  @override
  List<Object?> get props => [offlineSyncId, status, retryCount];
}
