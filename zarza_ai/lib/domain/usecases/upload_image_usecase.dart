import 'dart:io';
import '../entities/fruit_analysis.dart';
import '../entities/upload_metadata.dart';
import '../repositories/i_ingestion_repository.dart';

class UploadImageUseCase {
  const UploadImageUseCase(this._repository);
  final IIngestionRepository _repository;

  Future<UploadResult> call(File image, UploadMetadata metadata) =>
      _repository.uploadImage(image, metadata);
}
