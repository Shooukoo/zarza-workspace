import 'dart:io';

import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

abstract class ImageCompressionService {
  Future<File> compress(File source);
}

class ImageCompressionServiceImpl implements ImageCompressionService {
  const ImageCompressionServiceImpl();

  static const _maxSide = 1280;
  static const _quality = 85;
  static const _uuid = Uuid();

  @override
  Future<File> compress(File source) async {
    final tmpDir = await getTemporaryDirectory();
    final outDir = Directory('${tmpDir.path}/zarza_compressed');
    if (!outDir.existsSync()) outDir.createSync(recursive: true);
    final targetPath = '${outDir.path}/${_uuid.v4()}.jpg';

    final result = await FlutterImageCompress.compressAndGetFile(
      source.absolute.path,
      targetPath,
      minWidth: _maxSide,
      minHeight: _maxSide,
      quality: _quality,
      format: CompressFormat.jpeg,
      keepExif: false,
    );

    if (result == null) {
      throw StateError('Image compression failed for: ${source.path}');
    }

    return File(result.path);
  }
}
