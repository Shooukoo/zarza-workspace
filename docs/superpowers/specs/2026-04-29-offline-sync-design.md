# Sincronización Offline — Spec de Diseño

**Fecha:** 2026-04-29  
**Proyecto:** Zarza AI — `zarza_ai` (Flutter)  
**Autor:** Santiago Nuñez  

---

## 1. Contexto y Objetivo

Los usuarios Monitor/Productor capturan imágenes de plantas en campo, donde la conectividad a internet es intermitente o inexistente. Cuando no hay red, la imagen y sus metadatos deben guardarse localmente. Al recuperar conexión y abrir la app, un proceso de sincronización debe procesar la cola hacia el endpoint `POST /api/ingestion/upload`.

El backend ya soporta todos los campos necesarios: `campoId`, `gpsLat`, `gpsLon`, `capturedAt`, `offlineSyncId`. La implementación es exclusivamente en el cliente Flutter.

---

## 2. Decisiones de Diseño

| Decisión | Elección | Razón |
|---|---|---|
| Patrón de offline | `OfflineAwareRepository` (Decorator) | Cero cambios en BLoC y use cases; el offline queda encapsulado en infrastructure |
| Storage local | **Isar** | NoSQL embebido, Dart-nativo, índices tipados, sin SQL manual |
| Trigger de sync | Al abrir la app (`main.dart`) | Simple, sin permisos de background extra; suficiente para el caso de uso |
| Notificación | Persistente (`ongoing: true`) via `flutter_local_notifications` (ya en proyecto) | El usuario sabe que tiene capturas pendientes sin abrir la app |
| Selector de campo | Dropdown en `CaptureScreen` | `campoId` es requerido en el evento RabbitMQ `nueva_fruta` |
| GPS | `geolocator`, no bloqueante (timeout 5s) | El GPS puede fallar o denegarse; `null` es aceptable en el backend |
| `offlineSyncId` | Generado siempre en cliente (UUID v4) | Garantiza idempotencia en reintentos: el backend tiene índice sparse único |

---

## 3. Arquitectura

### 3.1 Nuevos componentes

```
domain/
  entities/
    upload_metadata.dart              ← value object: campoId, gpsLat, gpsLon, capturedAt, offlineSyncId
    pending_upload.dart               ← entidad de dominio (sin anotaciones Isar)
  repositories/
    i_offline_queue_repository.dart   ← contrato CRUD de la cola
  usecases/
    sync_pending_uploads_usecase.dart
    delete_pending_upload_usecase.dart
    watch_pending_uploads_usecase.dart ← Stream<List<PendingUpload>> para la pantalla

data/
  datasources/
    local_queue_datasource.dart       ← Isar: implementa i_offline_queue_repository
  repositories/
    offline_queue_repository_impl.dart
    offline_aware_ingestion_repository.dart  ← decorator sobre IngestionRepositoryImpl

core/
  services/
    connectivity_service.dart         ← wrapper de connectivity_plus
    sync_service.dart                 ← orquesta sync al abrir app

presentation/
  queue/
    offline_queue_bloc.dart
    offline_queue_screen.dart
  capture/                            ← cambios en archivos existentes
```

### 3.2 Flujo principal

```
[CaptureScreen]
  1. Usuario selecciona imagen (cámara/galería)
  2. GPS capturado automáticamente (timeout 5s, nullable)
  3. Usuario selecciona campo del dropdown
  4. Toca "Analizar planta"
        ↓
[CaptureBloc] → UploadImageUseCase(file, UploadMetadata)
        ↓
[OfflineAwareIngestionRepository]
  ┌─ conectado? ─YES→ RemoteIngestionDatasource → backend → UploadResult(UPLOADED)
  └─ NO ──────────→ LocalQueueDatasource (Isar) → UploadResult(QUEUED)
        ↓
[CaptureBloc emite]
  CaptureSuccess(UPLOADED) → navega a /results/:id
  CaptureQueued            → snackbar "Sin conexión — captura guardada"

[App open → main.dart]
  SyncService.syncPending()
  → para cada PendingUpload(pending|syncing):
      reset syncing→pending
      upload secuencial
      éxito → eliminar de Isar
      fallo → retryCount++; si >= 3 → status = failed
  → notificación persistente mientras cola > 0
  → dismiss notificación al vaciarse
```

---

## 4. Modelo de Datos

### `UploadMetadata` (domain/entities)

```dart
class UploadMetadata {
  final String campoId;
  final double? gpsLat;
  final double? gpsLon;
  final DateTime capturedAt;
  final String offlineSyncId; // UUID v4, generado siempre en cliente
}
```

### `PendingUpload` (Isar collection)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `Id` | Auto-increment |
| `offlineSyncId` | `String` | Índice único — previene duplicados en cola |
| `imagePath` | `String` | Ruta absoluta en disco (no bytes) |
| `campoId` | `String` | |
| `gpsLat` | `double?` | |
| `gpsLon` | `double?` | |
| `capturedAt` | `DateTime` | |
| `queuedAt` | `DateTime` | |
| `status` | `PendingUploadStatus` | `pending \| syncing \| failed` |
| `retryCount` | `int` | Default 0 |
| `lastError` | `String?` | Mensaje del último fallo |

```dart
enum PendingUploadStatus { pending, syncing, failed }
```

**Nota:** `imagePath` apunta al archivo temporal de `image_picker`. La app debe copiar la imagen a un directorio persistente de la app (via `path_provider`) al encolar, ya que los temporales pueden ser limpiados por el OS.

---

## 5. Cambios en Componentes Existentes

### `IIngestionRepository` y cadena de implementaciones

```dart
// Antes
Future<UploadResult> uploadImage(File image);

// Después
Future<UploadResult> uploadImage(File image, UploadMetadata metadata);
```

Cambio propagado en: `IIngestionRepository`, `IngestionRepositoryImpl`, `OfflineAwareIngestionRepository`, `RemoteIngestionDatasource` (agrega campos al `FormData`), `UploadImageUseCase`.

### `UploadResult` (domain entity)

Agregar campo `status` si no existe, o expandir para soportar `'QUEUED'` además de `'UPLOADED'`.

### `CaptureBloc`

- Nuevos eventos: ninguno (el `CaptureUploadRequested` existente se mantiene).
- `CaptureUploadRequested` recibe `UploadMetadata` (o el BLoC lo construye desde estado interno).
- Nuevos estados:
  - `CaptureMetadataReady(File file, UploadMetadata metadata)` — imagen + metadatos listos
  - `CaptureQueued(String offlineSyncId)` — encolado sin red

### `CaptureScreen`

Flujo de 2 pasos:
1. Seleccionar imagen → estado `CaptureImageReady`
2. GPS se captura automáticamente; usuario selecciona campo → estado `CaptureMetadataReady`
3. Botón "Analizar planta" habilitado en `CaptureMetadataReady`

### `RemoteIngestionDatasource`

Agrega al `FormData`: `campoId`, `gpsLat`, `gpsLon`, `capturedAt` (ISO 8601), `offlineSyncId`.

### `service_locator.dart`

Registrar: `IsarService`, `LocalQueueDatasource`, `IOfflineQueueRepository`, `ConnectivityService`, `SyncService`, los tres nuevos use cases de cola, y el `OfflineQueueBloc`. Reemplazar el registro de `IIngestionRepository` con `OfflineAwareIngestionRepository`.

---

## 6. `SyncService` — Comportamiento Detallado

```
syncPending():
  1. Resetear todos los items con status=syncing → status=pending
     (la app fue matada durante un sync anterior)
  2. Obtener todos los items con status=pending
  3. Mostrar notificación persistente: "N capturas pendientes"
  4. Para cada item (secuencial, no paralelo):
       a. Marcar status=syncing
       b. Leer archivo de disco (si no existe → marcar failed, lastError="Archivo no encontrado", continuar)
       c. Llamar RemoteIngestionDatasource.uploadImage()
       d. Éxito → eliminar item de Isar
       e. Error 409 (duplicate offlineSyncId) → considerar éxito → eliminar
       f. Otro error → retryCount++
                        si retryCount >= 3 → status=failed
                        si retryCount < 3  → status=pending (reintentará próxima sesión)
  5. Actualizar notificación con progreso: "Sincronizando 2/N..."
  6. Al terminar: si cola vacía → dismiss notificación
                  si quedan failed → notificación: "N capturas fallidas — abre Zarza AI"
```

---

## 7. Notificaciones

Usar canal existente de `LocalNotificationsService`. Agregar método `showSyncProgress(int pending, int total)` y `dismissSync()`.

| Estado | Mensaje notificación |
|---|---|
| Cola > 0, app cerrada | "Zarza AI — `N` capturas pendientes de subir" |
| Sincronizando | "Zarza AI — Sincronizando `X`/`N` capturas…" |
| Cola vacía | Notificación descartada |
| Items fallidos | "Zarza AI — `N` capturas fallaron. Abre la app para revisar." |

Propiedad `ongoing: true` en Android (no descartable por swipe).

---

## 8. Pantalla de Cola (`OfflineQueueScreen`)

**Ruta:** `/queue` (agregar en `app_router.dart`)

**Acceso:** desde `HomeScreen` (badge con contador de pendientes).

### Layout

- `AppBar`: título "Capturas pendientes", botón "Sincronizar ahora" (habilitado si hay red y items pending/failed).
- Lista de cards por item:
  - Thumbnail de la imagen (via `Image.file`)
  - Chip de estado: gris (pendiente), naranja (fallido)
  - Nombre del campo + fecha/hora de captura
  - Si `failed`: texto del último error en rojo
  - Botón de papelera para eliminar

### `OfflineQueueBloc`

- Estado: `OfflineQueueState(List<PendingUpload> items, bool isSyncing)`
- Eventos: `QueueLoaded`, `QueueItemDeleted(String offlineSyncId)`, `QueueSyncRequested`
- `QueueSyncRequested` delega a `SyncService.syncPending()` y recarga la lista.

---

## 9. Manejo de Errores

| Caso | Comportamiento |
|---|---|
| Upload falla (red, timeout) | `retryCount++`; si < 3 → `pending`; si >= 3 → `failed` |
| Backend responde 409 | Considerar éxito — item ya procesado, eliminar de cola |
| Imagen borrada del disco | `failed`, `lastError = "Archivo no encontrado"`, no reintenta |
| GPS denegado / timeout | Proceder con `gpsLat: null, gpsLon: null` |
| Isar falla al escribir | Emitir `CaptureFailure` con mensaje de error de almacenamiento |
| `offlineSyncId` duplicado en cola | Índice único de Isar previene inserción — ignorar silenciosamente |

---

## 10. Nuevas Dependencias (`pubspec.yaml`)

```yaml
isar: ^3.1.0
isar_flutter_libs: ^3.1.0  # incluye binarios nativos
path_provider: ^2.1.4       # para directorio persistente de imágenes
connectivity_plus: ^6.1.1
geolocator: ^13.0.2
uuid: ^4.5.1                # generación de offline_sync_id

dev_dependencies:
  isar_generator: ^3.1.0
  build_runner: ^2.4.13     # ya existe
```

---

## 11. Testing

| Componente | Escenario |
|---|---|
| `OfflineAwareIngestionRepository` | Sin conectividad → guarda en cola, retorna `QUEUED` |
| `OfflineAwareIngestionRepository` | Con conectividad → delega al remoto |
| `SyncService` | Items `syncing` se resetean a `pending` al iniciar |
| `SyncService` | Upload exitoso elimina item de cola |
| `SyncService` | 3 fallos consecutivos → status `failed` |
| `SyncService` | Respuesta 409 → item eliminado (idempotencia) |
| `CaptureBloc` | `UploadResult(status: QUEUED)` emite `CaptureQueued` |
| `LocalQueueDatasource` | Índice único de `offlineSyncId` previene duplicados |

Tests usan mocks de `ConnectivityService`, `IOfflineQueueRepository` e `IIngestionRepository`. Sin dependencias de Isar real ni red.
