import 'dart:io';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:zarza_ai/core/services/image_compression_service.dart';
import 'package:zarza_ai/domain/entities/fruit_analysis.dart';
import 'package:zarza_ai/domain/entities/upload_metadata.dart';
import 'package:zarza_ai/domain/usecases/upload_image_usecase.dart';
import 'package:zarza_ai/presentation/capture/capture_bloc.dart';

class MockUploadImageUseCase extends Mock implements UploadImageUseCase {}
class MockImageCompressionService extends Mock implements ImageCompressionService {}
class FakeFile extends Fake implements File {}
class FakeUploadMetadata extends Fake implements UploadMetadata {}

void main() {
  late MockUploadImageUseCase uploadUseCase;
  late MockImageCompressionService compressionService;
  late File rawFile;
  late File compressedFile;

  setUpAll(() {
    registerFallbackValue(FakeFile());
    registerFallbackValue(FakeUploadMetadata());
  });

  setUp(() {
    uploadUseCase = MockUploadImageUseCase();
    compressionService = MockImageCompressionService();
    rawFile = File('/raw/image.jpg');
    compressedFile = File('/tmp/zarza_compressed/abc.jpg');
  });

  CaptureBloc buildBloc() =>
      CaptureBloc(uploadUseCase, compressionService);

  group('CaptureImageSelected', () {
    blocTest<CaptureBloc, CaptureState>(
      'emits CaptureImageReady with compressed file on success',
      build: buildBloc,
      setUp: () {
        when(() => compressionService.compress(rawFile))
            .thenAnswer((_) async => compressedFile);
      },
      act: (bloc) => bloc.add(CaptureImageSelected(rawFile)),
      expect: () => [CaptureImageReady(compressedFile)],
    );

    blocTest<CaptureBloc, CaptureState>(
      'emits CaptureFailure when compression throws',
      build: buildBloc,
      setUp: () {
        when(() => compressionService.compress(rawFile))
            .thenThrow(StateError('compression failed'));
      },
      act: (bloc) => bloc.add(CaptureImageSelected(rawFile)),
      expect: () => [
        isA<CaptureFailure>().having(
          (s) => s.message,
          'message',
          'No se pudo procesar la imagen.',
        ),
      ],
    );
  });

  group('CaptureMetadataUpdated', () {
    blocTest<CaptureBloc, CaptureState>(
      'emits a new state when GPS arrives after the campo was selected',
      build: buildBloc,
      seed: () => CaptureImageReady(compressedFile),
      act: (bloc) => bloc
        ..add(const CaptureMetadataUpdated(campoId: 'campo-1'))
        ..add(const CaptureMetadataUpdated(
          campoId: 'campo-1',
          gpsLat: 19.72202,
          gpsLon: -101.184885,
        )),
      expect: () => [
        CaptureMetadataReady(file: compressedFile, campoId: 'campo-1'),
        CaptureMetadataReady(
          file: compressedFile,
          campoId: 'campo-1',
          gpsLat: 19.72202,
          gpsLon: -101.184885,
        ),
      ],
    );

    blocTest<CaptureBloc, CaptureState>(
      'uploads with the GPS received after the campo was selected',
      build: buildBloc,
      seed: () => CaptureImageReady(compressedFile),
      setUp: () {
        when(() => uploadUseCase(any(), any())).thenAnswer(
          (_) async => const UploadResult(
            imageId: 'img-1',
            storageKey: 'raw/img-1.jpg',
            status: 'UPLOADED',
          ),
        );
      },
      act: (bloc) async {
        bloc.add(const CaptureMetadataUpdated(campoId: 'campo-1'));
        bloc.add(const CaptureMetadataUpdated(
          campoId: 'campo-1',
          gpsLat: 19.72202,
          gpsLon: -101.184885,
        ));
        await Future<void>.delayed(Duration.zero);
        bloc.add(const CaptureUploadRequested());
      },
      verify: (_) {
        final metadata = verify(() => uploadUseCase(any(), captureAny()))
            .captured
            .single as UploadMetadata;
        expect(metadata.gpsLat, 19.72202);
        expect(metadata.gpsLon, -101.184885);
      },
    );
  });
}
