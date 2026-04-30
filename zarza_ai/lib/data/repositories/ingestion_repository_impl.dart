import 'dart:io';
import '../../domain/entities/fruit_analysis.dart';
import '../../domain/entities/upload_metadata.dart';
import '../../domain/repositories/i_ingestion_repository.dart';
import '../datasources/remote_ingestion_datasource.dart';

class IngestionRepositoryImpl implements IIngestionRepository {
  IngestionRepositoryImpl(this._datasource);
  final RemoteIngestionDatasource _datasource;

  @override
  Future<UploadResult> uploadImage(File image, UploadMetadata metadata) async {
    final model = await _datasource.uploadImage(image, metadata);
    return model.toEntity();
  }
}
