import 'dart:io';
import '../entities/fruit_analysis.dart';
import '../entities/upload_metadata.dart';

abstract class IIngestionRepository {
  Future<UploadResult> uploadImage(File image, UploadMetadata metadata);
}
