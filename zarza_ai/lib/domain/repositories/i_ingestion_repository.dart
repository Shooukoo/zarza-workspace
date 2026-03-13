import 'dart:io';
import '../entities/fruit_analysis.dart';

/// Contract for uploading images to the backend.
abstract class IIngestionRepository {
  Future<UploadResult> uploadImage(File image);
}
