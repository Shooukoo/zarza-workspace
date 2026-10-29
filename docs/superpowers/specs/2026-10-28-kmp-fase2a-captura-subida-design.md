# KMP Fase 2a: captura y subida

Fecha: 2026-10-28

## Contexto

La Fase 2 del roadmap (`rubus-ai-kmp/docs/roadmap-migracion-kmp.md`, 9–11 días) es demasiado grande para una sola spec y un solo plan. Se parte en tres sub-fases, cada una con su spec, plan y verificación:

| Sub-fase | Qué entrega |
|----------|-------------|
| **2a (esta spec)** | Foto o galería, compresión, GPS y subida con red. Cierra cuando el backend acepta la subida y el análisis aparece en `zarza-web`. |
| 2b | Cliente WebSocket con autenticación y reconexión; aviso `analisis_listo`. |
| 2c | Pantalla de resultados con detecciones y validación del agrónomo. |

La Fase 1 está implementada. Ya existen en `rubus-ai-kmp/shared`:

- Cliente Ktor con `Bearer` y refresh de token, `SessionEvents.expired` y `SessionManager`.
- Design system (`RubusButton`, `RubusCard`, `RubusTextField`, estados de carga y error).
- Rutas tipadas `Capture` y `Result(id)` como marcadores en `Route`.
- `ImageCompressor` y `LocationProvider` como interfaces vacías (`core/platform`), listas para recibir firma.
- Patrón de plataforma: interfaz en `commonMain` e implementación inyectada por Koin desde `androidMain/core/di` y `iosMain/core/di`.

Lo que hace Flutter hoy y se conserva (`zarza_ai/lib/presentation/capture/capture_screen.dart`): `image_picker` con la cámara y la galería del sistema; GPS con precisión alta y límite de 8 s; compresión JPEG de lado máximo 2048 px, calidad 85, sin EXIF; `POST /ingestion/upload` multipart con `file`, `campoId`, `capturedAt`, `offlineSyncId`, `gpsLat`, `gpsLon` y timeout de 90 s.

## Objetivo

Que un usuario autenticado tome o elija una foto, elija un campo y la suba con GPS (si lo hay) desde un teléfono Android físico.

## Fuera de alcance

- Cola offline, detección de conectividad y reintentos automáticos (Fase 3). Aquí el reintento es manual.
- Captura iniciada desde una solicitud de muestreo (`captureContext`, Fase 5).
- WebSocket y aviso `analisis_listo` (2b); pantalla de resultados y validación (2c).
- iOS: `actual` vacíos hasta la Fase 9. El código común no usa APIs de Android.
- Cambios en el backend (ver "Pendientes que salen de esta fase").

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Cámara y galería | Contratos de resultado de AndroidX (`TakePicture`, `PickVisualMedia`). No hay cámara propia. |
| Dónde viven los launchers | A nivel de Compose, con `expect/actual` de un `@Composable` (`rememberPhotoPicker`, `rememberLocationPermission`). Sobreviven a la rotación y a la muerte de proceso sin código extra. No se registran desde `MainActivity`. |
| Compresor y GPS | Interfaces en `commonMain` con implementación Android inyectada por Koin, como `SecureTokenStorage`. |
| Fallo de subida | Error visible, la foto sigue en pantalla y el usuario reintenta. Cada captura genera un `offlineSyncId` (UUID) que se reenvía igual en los reintentos. |
| Permiso de ubicación | Se pide al pulsar "Subir". Negarlo o no tener señal no bloquea la subida. |

## Diseño

### 1. Flujo

Home → botón de captura (`Route.Capture`) → cámara o galería → vista previa → elegir campo → "Subir" → al recibir 201, vuelve a Home con el aviso "Imagen enviada". El resultado se abre desde la 2c.

### 2. Piezas en `commonMain`

- **Modelos** (`core/model`): `Campo`, `UploadMetadata`, `UploadResult`.
- **`CamposRepository`**: `GET campos`. El backend filtra por rol: AGRONOMO recibe sus campos asignados, PRODUCTOR los suyos, ADMIN y MONITOR todos.
- **`IngestionRepository.upload(...)`**: multipart con los campos de arriba, timeout de 90 s por petición. Trata como éxito un 201 y, por defensa, un 409. Las peticiones multipart no declaran `Content-Type` a mano (lo pone Ktor con su boundary).
- **`CaptureViewModel`**: estados `Idle`, `FotoElegida`, `Subiendo`, `Error(reintentable)`. Genera el `offlineSyncId` al elegir la foto y lo conserva en los reintentos. Guarda en `SavedStateHandle` la ruta de la foto y el `offlineSyncId`.
- **`CaptureScreen`**: con los componentes del design system.
- **`ImageCompressor`** y **`LocationProvider`**: firmas en `core/platform`.
  - `ImageCompressor.compress(path): CompressedImage` (JPEG, lado máximo 2048 px, calidad 85, sin EXIF).
  - `LocationProvider.current(): Coordinates?`, con `null` si no hay permiso o señal en 8 s.

### 3. Piezas en `androidMain`

- **Compresor**: decodifica ya reducida (`inSampleSize` o tamaño objetivo), nunca la foto completa; corre en `Dispatchers.Default`; aplica la orientación del EXIF a los píxeles antes de descartarlo.
- **GPS**: Play Services Location, precisión alta, límite de 8 s. La dependencia se añade en esta fase (se quitó en la Fase 0, ver `dependencias-pendientes.md`).
- **Cámara**: `FileProvider` con un archivo temporal en la caché; la ruta se guarda con `rememberSaveable`. El manifiesto **no declara `CAMERA`**: con `TakePicture` abre la app de cámara del sistema y declararlo obligaría a pedir un permiso innecesario.
- **Galería**: `PickVisualMedia`, sin permiso.
- **Coil 3** no se necesita en la 2a (no hay imágenes remotas); llega en la 2c.

### 4. Errores

Se mapean por código HTTP, no por texto de la excepción:

| Causa | Mensaje | ¿Reintentable? |
|-------|---------|----------------|
| Sin red o timeout de 90 s | "Sin conexión o conexión lenta" | Sí, con el mismo `offlineSyncId` |
| 400 | "La imagen no es válida" | No: elegir otra |
| 429 | "Demasiados intentos, espera un momento" | Sí |
| 5xx | "Servidor no disponible" | Sí |
| 401 sin remedio | Lo resuelve `SessionEvents.expired`: login con aviso | — |
| Fallo al comprimir | "No se pudo procesar la imagen" | No: elegir otra |

Si `GET campos` falla, se muestra el error con reintento. Si la lista viene vacía, "No tienes campos asignados" y "Subir" queda desactivado. Los mensajes no incluyen el cuerpo de la respuesta ni el `message` de `ResponseException`.

### 5. Pruebas

- **`commonTest`** (con fakes): `CaptureViewModel` (transiciones, el reintento conserva el `offlineSyncId`, GPS nulo no bloquea, mapeo de errores) y los repositorios con Ktor `MockEngine` (campos multipart presentes, sin `Content-Type` manual).
- **`androidDeviceTest`** (emulador): compresor (dimensiones, calidad, ausencia de EXIF, orientación corregida) y proveedor de GPS.
- **Manual en un teléfono Android físico, que cierra la 2a:**
  1. Foto real de al menos 12 MP desde la cámara, y otra desde la galería.
  2. Negar el permiso de ubicación: la subida funciona sin GPS.
  3. Modo avión durante la subida: error visible; al reactivar la red, el reintento funciona.
  4. Muerte de proceso con la cámara abierta (opción de desarrollador "No conservar actividades"): la foto no se pierde.
  5. Rotación en la captura.
  6. El análisis aparece después en `zarza-web` con el campo y las coordenadas elegidos.
  Marca, modelo y versión de Android se anotan en el documento de pendientes al ejecutarlo.

## Decisión abierta antes de implementar

**Ráfaga de refrescos tras un fallo transitorio** (`dependencias-pendientes.md`, marcada como "decidir antes de la fase 2"). Con red mala, `GET campos` y la subida pueden pedir refresh a la vez, y cada petición en espera repite `auth/refresh` (5 por minuto), con hasta N × 30 s de espera. La 2a lo expone más que la Fase 1. Opciones: recordar unos segundos que ese refresh token acaba de fallar y no reintentarlo (arreglo probado en las revisiones; a cambio, un reintento manual dentro de esa ventana falla sin intentarlo), o aceptar el comportamiento actual. Se decide al escribir el plan.

## Pendientes que salen de esta fase

- **El backend no deduplica por `offlineSyncId` en la subida.** `POST /ingestion/upload` responde 201 siempre y no devuelve 409; `fruit-ms` hace un `create` sobre `Analysis.offlineSyncId` (`@unique`). Un reintento con el mismo id no crea un análisis duplicado, pero corre otra inferencia, falla al insertar, se reintenta 3 veces y termina en la DLQ. Arreglo propuesto: que `fruit-ms` trate la violación de unicidad como éxito idempotente (ack sin reintentar). El roadmap dice "un 409 del servidor cuenta como éxito", que describe un comportamiento que el backend actual no tiene; corregir esa línea en la Fase 3.
