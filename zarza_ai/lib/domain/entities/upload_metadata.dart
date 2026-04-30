import 'package:equatable/equatable.dart';

class UploadMetadata extends Equatable {
  const UploadMetadata({
    required this.campoId,
    required this.capturedAt,
    required this.offlineSyncId,
    this.gpsLat,
    this.gpsLon,
  });

  final String campoId;
  final DateTime capturedAt;
  final String offlineSyncId;
  final double? gpsLat;
  final double? gpsLon;

  @override
  List<Object?> get props => [campoId, capturedAt, offlineSyncId, gpsLat, gpsLon];
}
