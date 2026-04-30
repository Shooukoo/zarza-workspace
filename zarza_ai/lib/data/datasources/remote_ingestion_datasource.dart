import 'dart:io';
import 'package:dio/dio.dart';
import '../../core/constants/app_constants.dart';
import '../models/upload_response_model.dart';

class RemoteIngestionDatasource {
  RemoteIngestionDatasource(this._dio);
  final Dio _dio;

  Future<UploadResponseModel> uploadImage(File image) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        image.path,
        filename: image.path.split('/').last.split('\\').last,
      ),
    });

    final response = await _dio.post(
      AppConstants.uploadEndpoint,
      data: formData,
      options: Options(
        sendTimeout:
            const Duration(seconds: AppConstants.uploadTimeoutSeconds),
        receiveTimeout:
            const Duration(seconds: AppConstants.uploadTimeoutSeconds),
      ),
    );

    return UploadResponseModel.fromJson(
      response.data is Map<String, dynamic>
          ? response.data as Map<String, dynamic>
          : <String, dynamic>{},
    );
  }
}
