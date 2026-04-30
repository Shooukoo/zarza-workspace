import 'dart:io';
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:zarza_ai/domain/entities/fruit_analysis.dart';
import 'package:zarza_ai/domain/entities/upload_metadata.dart';
import 'package:zarza_ai/domain/usecases/upload_image_usecase.dart';
import 'package:zarza_ai/presentation/capture/capture_bloc.dart';

import 'capture_bloc_test.mocks.dart';

@GenerateMocks([UploadImageUseCase])
void main() {
  late MockUploadImageUseCase mockUseCase;
  late CaptureBloc bloc;
  final fakeFile = File('/tmp/test.jpg');

  setUp(() {
    mockUseCase = MockUploadImageUseCase();
    bloc = CaptureBloc(mockUseCase);
  });

  tearDown(() => bloc.close());

  test('initial state is CaptureInitial', () {
    expect(bloc.state, isA<CaptureInitial>());
  });

  blocTest<CaptureBloc, CaptureState>(
    'emits CaptureImageReady when image selected',
    build: () => bloc,
    act: (b) => b.add(CaptureImageSelected(fakeFile)),
    expect: () => [isA<CaptureImageReady>()],
  );

  blocTest<CaptureBloc, CaptureState>(
    'emits CaptureMetadataReady when metadata updated after image',
    build: () => bloc,
    seed: () => CaptureImageReady(fakeFile),
    act: (b) => b.add(const CaptureMetadataUpdated(campoId: 'c-1')),
    expect: () => [isA<CaptureMetadataReady>()],
  );

  blocTest<CaptureBloc, CaptureState>(
    'emits CaptureQueued when upload result is QUEUED',
    build: () {
      when(mockUseCase(any, any)).thenAnswer((_) async => const UploadResult(
            imageId: 'sync-uuid',
            storageKey: '',
            status: 'QUEUED',
          ));
      return bloc;
    },
    seed: () => CaptureMetadataReady(
      file: fakeFile,
      campoId: 'campo-1',
    ),
    act: (b) => b.add(const CaptureUploadRequested()),
    expect: () => [isA<CaptureUploading>(), isA<CaptureQueued>()],
  );

  blocTest<CaptureBloc, CaptureState>(
    'emits CaptureSuccess when upload result is UPLOADED',
    build: () {
      when(mockUseCase(any, any)).thenAnswer((_) async => const UploadResult(
            imageId: 'img-1',
            storageKey: 'key-1',
            status: 'UPLOADED',
          ));
      return bloc;
    },
    seed: () => CaptureMetadataReady(file: fakeFile, campoId: 'campo-1'),
    act: (b) => b.add(const CaptureUploadRequested()),
    expect: () => [isA<CaptureUploading>(), isA<CaptureSuccess>()],
  );
}
