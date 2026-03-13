import '../../domain/entities/fruit_analysis.dart';

/// DTO for the response from POST /api/ingestion/upload
class UploadResponseModel {
  const UploadResponseModel({
    required this.imageId,
    required this.storageKey,
    required this.status,
  });

  final String imageId;
  final String storageKey;
  final String status;

  factory UploadResponseModel.fromJson(Map<String, dynamic> json) {
    return UploadResponseModel(
      imageId: json['image_id'] as String,
      storageKey: json['storage_key'] as String,
      status: (json['status'] as String?) ?? 'UPLOADED',
    );
  }

  UploadResult toEntity() => UploadResult(
        imageId: imageId,
        storageKey: storageKey,
        status: status,
      );
}
