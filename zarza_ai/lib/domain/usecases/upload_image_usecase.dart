import 'dart:io';
import '../entities/fruit_analysis.dart';
import '../repositories/i_ingestion_repository.dart';

class UploadImageUseCase {
  const UploadImageUseCase(this._repository);
  final IIngestionRepository _repository;

  Future<UploadResult> call(File image) => _repository.uploadImage(image);
}
