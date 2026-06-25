# Image Compression Before Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress camera images client-side in Flutter (max 1280 px / JPEG Q85) before uploading to `fruit-backend`, reducing upload time and Cloudflare R2 storage cost.

**Architecture:** A new `ImageCompressionService` (abstract class + `Impl`) lives in `core/services/`. `CaptureBloc._onImageSelected` becomes async and calls the service, emitting `CaptureImageReady` with the compressed file. `LocalQueueDatasource.delete()` is extended to delete the persisted image file from disk before removing the DB row. The rest of the pipeline (datasources, repositories, backend) is untouched.

**Tech Stack:** Flutter / Dart, `flutter_image_compress ^2.3.0`, `path_provider` (already present), `uuid` (already present), `mocktail` (already in dev_dependencies), `bloc_test` (already in dev_dependencies).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Add dep** | `zarza_ai/pubspec.yaml` | Add `flutter_image_compress` |
| **Create** | `zarza_ai/lib/core/services/image_compression_service.dart` | Abstract interface + `Impl` that uses `flutter_image_compress` |
| **Modify** | `zarza_ai/lib/core/di/service_locator.dart` | Register `ImageCompressionService` singleton; inject into `CaptureBloc` factory |
| **Modify** | `zarza_ai/lib/presentation/capture/capture_bloc.dart` | `_onImageSelected` → async with compression; delete compressed file on online success |
| **Modify** | `zarza_ai/lib/data/datasources/local_queue_datasource.dart` | `delete()` reads `imagePath` from row and deletes the file before removing the row |
| **Create** | `zarza_ai/test/presentation/capture/capture_bloc_test.dart` | BLoC unit tests with mocked `ImageCompressionService` |
| **Create** | `zarza_ai/test/data/datasources/local_queue_datasource_test.dart` | Unit test for file-cleanup on `delete()` |

---

## Task 1: Add `flutter_image_compress` dependency

**Files:**
- Modify: `zarza_ai/pubspec.yaml`

- [ ] **Step 1: Add dependency**

Open `zarza_ai/pubspec.yaml`. Under the `# Image` comment block (after `image_picker`), add:

```yaml
  flutter_image_compress: ^2.3.0
```

The block should look like:

```yaml
  # Image
  image_picker: ^1.1.2
  flutter_image_compress: ^2.3.0
```

- [ ] **Step 2: Fetch the package**

```bash
cd zarza_ai
flutter pub get
```

Expected output: ends with `Got dependencies!` — no errors.

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/pubspec.yaml zarza_ai/pubspec.lock
git commit -m "chore(zarza_ai): add flutter_image_compress dependency"
```

---

## Task 2: Create `ImageCompressionService`

**Files:**
- Create: `zarza_ai/lib/core/services/image_compression_service.dart`

- [ ] **Step 1: Write the file**

Create `zarza_ai/lib/core/services/image_compression_service.dart` with this content:

```dart
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
```

> **Note on `minWidth`/`minHeight`:** `flutter_image_compress` scales the image so that neither dimension exceeds these values while preserving aspect ratio. A 4000×3000 image becomes 1280×960; a 3000×4000 portrait becomes 960×1280. Images already smaller than 1280 px are not upscaled.

- [ ] **Step 2: Verify it compiles**

```bash
cd zarza_ai
flutter analyze lib/core/services/image_compression_service.dart
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/core/services/image_compression_service.dart
git commit -m "feat(zarza_ai): add ImageCompressionService (1280px/Q85)"
```

---

## Task 3: Register service in GetIt and wire into `CaptureBloc` factory

**Files:**
- Modify: `zarza_ai/lib/core/di/service_locator.dart`

- [ ] **Step 1: Add import**

At the top of `service_locator.dart`, add this import alongside the other `core/services` imports (near lines 54–58):

```dart
import '../services/image_compression_service.dart';
```

- [ ] **Step 2: Register the service**

Inside `setupServiceLocator()`, after the `LocalNotificationsService` block and before the `FcmService` block (around line 84), add:

```dart
  sl.registerLazySingleton<ImageCompressionService>(
    () => const ImageCompressionServiceImpl(),
  );
```

- [ ] **Step 3: Update the `CaptureBloc` factory**

Find this line (around line 232):

```dart
  sl.registerFactory<CaptureBloc>(() => CaptureBloc(sl<UploadImageUseCase>()));
```

Replace it with:

```dart
  sl.registerFactory<CaptureBloc>(() => CaptureBloc(
        sl<UploadImageUseCase>(),
        sl<ImageCompressionService>(),
      ));
```

- [ ] **Step 4: Verify it compiles**

```bash
cd zarza_ai
flutter analyze lib/core/di/service_locator.dart
```

Expected: no errors (the BLoC constructor update comes in Task 4, so this will fail until then — that's expected).

- [ ] **Step 5: Commit (after Task 4 passes analysis)**

Hold this commit until Task 4 is done. Skip for now.

---

## Task 4: Update `CaptureBloc` — compress on selection, clean up on success

**Files:**
- Modify: `zarza_ai/lib/presentation/capture/capture_bloc.dart`
- Create: `zarza_ai/test/presentation/capture/capture_bloc_test.dart`

- [ ] **Step 1: Write the failing tests**

Create `zarza_ai/test/presentation/capture/capture_bloc_test.dart`:

```dart
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
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd zarza_ai
flutter test test/presentation/capture/capture_bloc_test.dart
```

Expected: compilation error because `CaptureBloc` still takes only one constructor argument.

- [ ] **Step 3: Update `CaptureBloc`**

Open `zarza_ai/lib/presentation/capture/capture_bloc.dart`.

**3a. Add import** at the top (after the existing imports):

```dart
import '../../core/services/image_compression_service.dart';
```

**3b. Update the class fields and constructor** (replace lines 112–118):

```dart
class CaptureBloc extends Bloc<CaptureEvent, CaptureState> {
  CaptureBloc(this._uploadImageUseCase, this._compressionService)
      : super(const CaptureInitial()) {
    on<CaptureImageSelected>(_onImageSelected);
    on<CaptureMetadataUpdated>(_onMetadataUpdated);
    on<CaptureUploadRequested>(_onUploadRequested);
    on<CaptureClearEvent>(_onClear);
  }

  final UploadImageUseCase _uploadImageUseCase;
  final ImageCompressionService _compressionService;
  static const _uuid = Uuid();
```

**3c. Replace `_onImageSelected`** (was sync, becomes async). Replace the current method (lines 123–125):

```dart
  Future<void> _onImageSelected(
    CaptureImageSelected event,
    Emitter<CaptureState> emit,
  ) async {
    try {
      final compressed = await _compressionService.compress(event.file);
      emit(CaptureImageReady(compressed));
    } on Object catch (e, stack) {
      developer.log('[CaptureBloc] compression failed', error: e, stackTrace: stack);
      emit(const CaptureFailure('No se pudo procesar la imagen.'));
    }
  }
```

**3d. Add file cleanup in `_onUploadRequested`**. Replace the success branch (lines 160–165):

```dart
      final result = await _uploadImageUseCase(current.file, metadata);
      if (result.status == 'QUEUED') {
        emit(CaptureQueued(result.imageId));
      } else {
        if (await current.file.exists()) await current.file.delete();
        emit(CaptureSuccess(result));
      }
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd zarza_ai
flutter test test/presentation/capture/capture_bloc_test.dart
```

Expected: all tests pass.

- [ ] **Step 5: Verify full analyze**

```bash
cd zarza_ai
flutter analyze
```

Expected: no errors (service_locator.dart update from Task 3 now compiles too).

- [ ] **Step 6: Commit Tasks 3 and 4 together**

```bash
git add \
  zarza_ai/lib/core/di/service_locator.dart \
  zarza_ai/lib/core/services/image_compression_service.dart \
  zarza_ai/lib/presentation/capture/capture_bloc.dart \
  zarza_ai/test/presentation/capture/capture_bloc_test.dart
git commit -m "feat(zarza_ai): compress images on selection in CaptureBloc"
```

---

## Task 5: Clean up persisted image file when deleting from offline queue

**Files:**
- Modify: `zarza_ai/lib/data/datasources/local_queue_datasource.dart`
- Create: `zarza_ai/test/data/datasources/local_queue_datasource_test.dart`

**Context:** When a pending upload completes (sync success or max retries exceeded), `IOfflineQueueRepository.delete(offlineSyncId)` is called. The `imagePath` stored in the DB row points to `{appDocumentsDir}/{offlineSyncId}.jpg` — this file must be deleted to avoid accumulating orphaned images on the device.

- [ ] **Step 1: Write the failing tests**

Create `zarza_ai/test/data/datasources/local_queue_datasource_test.dart`:

```dart
import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import 'package:zarza_ai/data/datasources/app_database.dart';
import 'package:zarza_ai/data/datasources/local_queue_datasource.dart';
import 'package:zarza_ai/domain/entities/pending_upload.dart';

// Minimal path_provider mock to avoid MissingPluginException
class FakePathProviderPlatform extends Fake
    with MockPlatformInterfaceMixin
    implements PathProviderPlatform {
  @override
  Future<String?> getTemporaryPath() async => Directory.systemTemp.path;

  @override
  Future<String?> getApplicationDocumentsPath() async =>
      Directory.systemTemp.path;
}

void main() {
  late AppDatabase db;
  late LocalQueueDatasource datasource;

  setUp(() {
    PathProviderPlatform.instance = FakePathProviderPlatform();
    db = AppDatabase.forTesting(NativeDatabase.memory());
    datasource = LocalQueueDatasource(db);
  });

  tearDown(() async {
    await db.close();
  });

  group('LocalQueueDatasource.delete()', () {
    test('deletes the image file from disk when it exists', () async {
      // Create a real temp file to act as the persisted image
      final imageFile = File(
        '${Directory.systemTemp.path}/test_image_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      imageFile.writeAsBytesSync([0xFF, 0xD8, 0xFF]); // minimal JPEG header
      expect(imageFile.existsSync(), isTrue);

      final item = PendingUpload(
        offlineSyncId: 'sync-001',
        imagePath: imageFile.path,
        campoId: 'campo-1',
        capturedAt: DateTime(2026, 6, 25),
        queuedAt: DateTime(2026, 6, 25),
        status: PendingUploadStatus.pending,
      );
      await datasource.enqueue(item);

      await datasource.delete('sync-001');

      expect(imageFile.existsSync(), isFalse);
    });

    test('does not throw when image file is already missing', () async {
      final item = PendingUpload(
        offlineSyncId: 'sync-002',
        imagePath: '/nonexistent/path/image.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026, 6, 25),
        queuedAt: DateTime(2026, 6, 25),
        status: PendingUploadStatus.pending,
      );
      await datasource.enqueue(item);

      // Must not throw
      await expectLater(datasource.delete('sync-002'), completes);
    });

    test('removes the DB row regardless of file state', () async {
      final item = PendingUpload(
        offlineSyncId: 'sync-003',
        imagePath: '/nonexistent/image.jpg',
        campoId: 'campo-1',
        capturedAt: DateTime(2026, 6, 25),
        queuedAt: DateTime(2026, 6, 25),
        status: PendingUploadStatus.pending,
      );
      await datasource.enqueue(item);
      await datasource.delete('sync-003');

      final remaining = await datasource.getPending();
      expect(remaining, isEmpty);
    });
  });
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd zarza_ai
flutter test test/data/datasources/local_queue_datasource_test.dart
```

Expected: test for file deletion fails because `delete()` does not yet remove the file.

- [ ] **Step 4: Update `LocalQueueDatasource.delete()`**

Open `zarza_ai/lib/data/datasources/local_queue_datasource.dart`.

Add `dart:io` import at the top (it's already imported in other files, just not this one):

```dart
import 'dart:io';
```

Replace the `delete` method (lines 45–49):

```dart
  Future<void> delete(String offlineSyncId) async {
    final row = await (_db.select(_db.pendingUploads)
          ..where((t) => t.offlineSyncId.equals(offlineSyncId)))
        .getSingleOrNull();

    if (row != null) {
      final imageFile = File(row.imagePath);
      if (imageFile.existsSync()) imageFile.deleteSync();
    }

    await (_db.delete(_db.pendingUploads)
          ..where((t) => t.offlineSyncId.equals(offlineSyncId)))
        .go();
  }
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd zarza_ai
flutter test test/data/datasources/local_queue_datasource_test.dart
```

Expected: all 3 tests pass.

- [ ] **Step 6: Run the full test suite**

```bash
cd zarza_ai
flutter test
```

Expected: all tests pass. Investigate any failures before proceeding.

- [ ] **Step 7: Commit**

```bash
git add \
  zarza_ai/lib/data/datasources/local_queue_datasource.dart \
  zarza_ai/test/data/datasources/local_queue_datasource_test.dart
git commit -m "feat(zarza_ai): delete image file from disk on queue remove"
```

---

## Self-Review Checklist

- [x] **Spec: compress on selection** → Task 4, `_onImageSelected` async with compression service call
- [x] **Spec: max 1280 px / Q85** → Task 2, `_maxSide = 1280`, `_quality = 85`
- [x] **Spec: write to temp dir** → Task 2, `getTemporaryDirectory()/zarza_compressed/`
- [x] **Spec: CaptureFailure on error** → Task 4, catch block emits `CaptureFailure('No se pudo procesar la imagen.')`
- [x] **Spec: register in GetIt** → Task 3
- [x] **Spec: file cleanup on online success** → Task 4, `_onUploadRequested` deletes file after non-QUEUED success
- [x] **Spec: file cleanup on queue delete** → Task 5, `LocalQueueDatasource.delete()`
- [x] **Spec: no changes to SyncService, RemoteIngestionDatasource, fruit-backend** → confirmed, none of those files appear in this plan
- [x] **Types consistent**: `ImageCompressionService` abstract class used in BLoC field type, GetIt registration, and mock — all reference the same abstract type
- [x] **No TBD/TODO placeholders**

---

## Notes

- The `plugin_platform_interface` package is a transitive dependency of `path_provider` — no need to add it explicitly to `pubspec.yaml`.
- `AppDatabase.forTesting` constructor — check `app_database.dart` first; if the class uses `@DriftDatabase` annotation with a generated `_$AppDatabase` superclass, add the constructor in the hand-written file, not the generated `.g.dart`.
- `flutter_image_compress` requires NDK on Android builds. If the CI pipeline fails on build, ensure the Android NDK version in `android/local.properties` is ≥ 21.
