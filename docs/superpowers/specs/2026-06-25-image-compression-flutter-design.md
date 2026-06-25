# Image Compression Before Upload — Design Spec

**Date:** 2026-06-25
**Scope:** `zarza_ai` (Flutter client only)
**Goal:** Reduce upload time and Cloudflare R2 storage cost by compressing images on-device before sending them to `fruit-backend`.

---

## Context

Currently `RemoteIngestionDatasource.uploadImage()` sends the raw camera file (typically 4–8 MB) as multipart form data. No compression happens anywhere in the pipeline. In field conditions with poor signal, this is the primary cause of slow or failed uploads.

The YOLOv8 model in `fruit-inference` requires sufficient detail to distinguish the 7 fenological stages of blackberry — aggressive compression risks accuracy. A conservative profile (max 1280 px / JPEG Q85) reduces file size by ~60–70% while remaining safe for inference.

---

## Decisions

| Question | Decision | Rationale |
|---|---|---|
| Where to compress? | Client (Flutter) | Only option that saves upload bandwidth, not just R2 storage |
| Compression profile | Max 1280 px longest side, JPEG Q85 | Preserves detail for small-object detection; ~60–70% size reduction |
| When to compress? | On image selection (`CaptureImageSelected`) | File is compressed once; works identically for online and offline sync flows |
| Implementation pattern | `ImageCompressionService` in `core/services/` | Matches existing service pattern; testable in isolation |
| Package | `flutter_image_compress ^2.3.0` | Native-backed (libjpeg-turbo / ImageIO), actively maintained |

---

## Components

### New: `lib/core/services/image_compression_service.dart`

Single public method:

```dart
Future<File> compress(File source) async
```

Behavior:
- Reads `source` (never modifies it)
- Resizes to fit within 1280 × 1280 px, preserving aspect ratio
- Re-encodes as JPEG quality 85
- Writes output to `{appDocumentsDir}/zarza_uploads/<uuid>.jpg`
- Returns the output `File`
- Throws on invalid input or OOM so the caller can surface the error

### Modified: `pubspec.yaml`

Add dependency:
```yaml
flutter_image_compress: ^2.3.0
```

### Modified: `lib/core/di/service_locator.dart`

Register as singleton (no external deps, no mutable state):
```dart
getIt.registerSingleton<ImageCompressionService>(ImageCompressionService());
```

### Modified: `lib/presentation/capture/capture_bloc.dart`

- Inject `ImageCompressionService` via constructor
- `_onImageSelected` becomes `async`:
  1. Calls `_compressionService.compress(event.file)`
  2. On success → emits `CaptureImageReady(compressedFile)`
  3. On error → emits `CaptureFailure('No se pudo procesar la imagen')`

No other handlers change.

### No changes required

- `SyncService` — already works with any `File` path from disk
- `RemoteIngestionDatasource` — already sends a `File` as multipart
- `fruit-backend` — already accepts JPEG; magic-number validation passes
- `OfflineAwareIngestionRepository` — stores `file.path`; compressed file lives in `appDocumentsDir` so it survives between sessions

### Modified: `OfflineQueueRepository.delete()`

Add `File(imagePath).deleteSync()` (if exists) before deleting the DB row to clean up compressed files once an upload is confirmed or permanently failed.

---

## Data Flow

```
User picks/captures image
        ↓
CaptureImageSelected(rawFile)
        ↓  _onImageSelected (async)
ImageCompressionService.compress(rawFile)
  → resize ≤ 1280 px, JPEG Q85
  → write {appDocDir}/zarza_uploads/<uuid>.jpg
        ↓
CaptureImageReady(compressedFile)
        ↓
[existing flow — unchanged]
CaptureMetadataUpdated  →  CaptureMetadataReady(compressedFile, campoId, gps…)
        ↓
CaptureUploadRequested  →  UploadImageUseCase(compressedFile, metadata)
        ↓
RemoteIngestionDatasource.uploadImage()  →  fruit-backend  →  R2

Offline path:
OfflineAwareIngestionRepository stores compressedFile.path in Drift queue
SyncService reads same path → uploadImage() → same backend flow
On success/failure → OfflineQueueRepository.delete() removes DB row + file
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| `compress()` throws (corrupt file, OOM) | `CaptureBloc` catches → emits `CaptureFailure('No se pudo procesar la imagen')` |
| Compressed file missing at sync time | `SyncService` already checks `file.existsSync()` → marks item `failed` |
| UUID filename collision | Statistically impossible; no additional guard needed |
| Upload fails permanently (3 retries) | `OfflineQueueRepository.delete()` cleans the compressed file from disk |

Original camera file is never modified or deleted by the compression service.

---

## Testing

### `ImageCompressionService` — unit / integration

- Fixture: small real JPEG in `test/fixtures/sample_fruit.jpg`
- Assert output file exists and `output.lengthSync() < input.lengthSync()`
- Assert output dimensions ≤ 1280 px (decode with `flutter_image_compress` or `image` package)
- Assert exception on invalid file input

### `CaptureBloc` — unit with mocktail

- Mock `ImageCompressionService`
- `CaptureImageSelected` → `compress()` called → `CaptureImageReady(compressedFile)` emitted
- `CaptureImageSelected` + `compress()` throws → `CaptureFailure` emitted
- Existing BLoC tests inject the mock via constructor

### `OfflineQueueRepository` — unit

- `delete()` with an existing file path → file deleted from disk after DB row removed
- `delete()` with a missing file path → no exception thrown

---

## Out of Scope

- Server-side compression or re-encoding in `fruit-backend`
- Progressive upload / chunked multipart
- Configurable quality settings exposed to the user
- Video or non-JPEG formats
