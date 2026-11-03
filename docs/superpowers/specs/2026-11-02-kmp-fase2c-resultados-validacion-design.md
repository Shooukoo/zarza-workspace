# KMP Fase 2c: resultados, validación y revisión de boxes

Fecha: 2026-11-02

## Contexto

La Fase 2 del roadmap (`rubus-ai-kmp/docs/roadmap-migracion-kmp.md`) se parte en tres sub-fases. La 2a (captura y subida) y la 2b (WebSocket y aviso `analisis_listo`) están integradas en `main` y verificadas en un teléfono Android. Esta spec es la 2c, la última de la fase.

| Sub-fase | Qué entrega |
|----------|-------------|
| 2a | Foto o galería, compresión, GPS y subida con red. Hecha. |
| 2b | Cliente WebSocket con autenticación y reconexión; aviso global «¡Análisis listo!». Hecha. |
| **2c (esta spec)** | Lista de análisis, detalle con imagen, validar o rechazar, y revisión de boxes que alimenta al modelo. |

### Endpoints del backend (no cambian)

Todos bajo `/api/v1/analyses`, con el scope del rol ya aplicado por el servidor.

| Endpoint | Roles | Uso |
|----------|-------|-----|
| `GET /` | ADMIN, AGRONOMO, PRODUCTOR | Lista paginada. Query: `page`, `limit`, `estado` (`pendiente` por defecto, `validado`, `rechazado`, `all`), `campo_id`, `revision_detecciones`. |
| `GET /:id` | ADMIN, AGRONOMO, PRODUCTOR | Detalle con `fenologiaEtapas` y `campo`. |
| `GET /:id/image` | ADMIN, AGRONOMO | `{ url, width, height }`. URL firmada de 15 min de la variante de despliegue (hasta 2048 px). `width` y `height` son los de la imagen original. |
| `PATCH /:id/validate` | ADMIN, AGRONOMO | Body `{ action: 'validado' \| 'rechazado', cronograma_corregido?, observaciones? }`. |
| `GET /:id/detections` | ADMIN, AGRONOMO | Detecciones con su estado ya resuelto: `{ id, origen, confidence, etapa, sano, bbox, eliminada }`. |
| `POST /:id/detections` | ADMIN, AGRONOMO | Agrega una detección: `{ etapa, sano, bbox }`. |
| `POST /:id/detections/:detectionId/feedback` | ADMIN, AGRONOMO | `{ accion: 'EDITAR' \| 'ELIMINAR', etapaCorregida?, saludCorregida?, bbox?, observaciones? }`. El feedback se acumula y manda el más reciente. |
| `PATCH /:id/review` | ADMIN, AGRONOMO | Marca las detecciones como revisadas. |

Etapas conocidas: `boton`, `flor`, `verde`, `naranja`, `marron`, `maduro`, `deteccion_gen`. Un `bbox` es `[x1, y1, x2, y2]` en píxeles de la imagen original y el servidor exige `x1 < x2` y `y1 < y2` (400 si no).

El rol MONITOR no tiene acceso a estos endpoints (403). El PRODUCTOR ve lista y detalle, pero no imagen ni detecciones.

### Referencia

El panel web (`zarza-web/src/analisis`, `zarza-web/src/revision-detecciones`) es la referencia de comportamiento. Esta spec no reproduce todo el panel: ver «Fuera de alcance».

## Objetivo

Que un agrónomo, en un teléfono físico, abra un análisis desde el aviso o desde la lista, vea la imagen con sus detecciones, lo valide o lo rechace con observaciones, y corrija boxes con el dedo (mover, redimensionar, cambiar etapa y salud, eliminar y agregar) para retroalimentar al modelo.

## Fuera de alcance

- **Corrección manual de la cantidad por etapa** (el formulario del modal web). La validación es solo validar o rechazar con observaciones; el backend acepta `cronograma_corregido` pero la app no lo manda.
- Deshacer, historial de feedback de un box, rotación de boxes.
- Cola y trabajo sin conexión (Fase 3). Todo aquí exige red.
- Bandeja de notificaciones y los eventos `analysis_validated` y `nueva_solicitud` (siguen ignorándose).
- Cambios en el backend. Si algo no encaja, se anota como pendiente, no se modifica.
- iOS: el código común debe compilar para iOS, pero la imagen con zoom usa una implementación mínima hasta la Fase 9 (ver «Plataforma»).

## Decisiones tomadas

- **Alcance:** lista, detalle, validar o rechazar simple, y revisión de boxes completa, todo en la 2c (el usuario descartó partirla en 2c/2d).
- **Entradas:** el aviso «¡Análisis listo!» (con acción «Ver») y una lista en `History`. La lista recupera los avisos perdidos con la app en segundo plano.
- **Validación:** `validado`, o `rechazado` con observaciones obligatorias, como en la web. Sin cronograma corregido.
- **Interacción de boxes:** tocar para elegir, arrastrar para mover, asas de esquina para redimensionar, botón «Agregar» y arrastre para dibujar. Un dedo edita; pellizco y dos dedos mueven la vista.
- **Guardado:** cada corrección se confirma y se guarda sola, como en la web. No hay borrador global.
- **Roles:** la app respeta lo que el backend permite y no esconde nada por su cuenta, salvo no mostrar controles que darían 403 (ver «Roles»).

## Diseño

### 1. Piezas

| Pieza | Capa | Qué hace |
|-------|------|----------|
| `Analysis`, `FenologiaEtapa`, `Detection`, `AnalysisImage`, `EstadoValidacion`, `Etapa` | `core/model` | Modelos de dominio (sin `@Serializable`). |
| `AnalysesRepository` + `AnalysesRepositoryImpl` | `core/data/analyses` | `list`, `get`, `imageUrl`, `validate`, `detections`, `feedback`, `addDetection`, `markReviewed`. Patrón de `CamposRepository`: resultado sellado `Success`/`Failure`, sin registrar cuerpos de error. Los DTO `@Serializable` son internos. |
| `BoxTransform` | `feature/review` | Función pura: pantalla a imagen e imagen a pantalla combinando escala de ajuste, zoom y desplazamiento; `clamp` al tamaño de la imagen; validación de tamaño mínimo. |
| `HistoryViewModel` / `HistoryScreen` | `feature/history` | Lista con filtros y carga incremental. |
| `ResultViewModel` / `ResultScreen` | `feature/results` | Detalle, imagen con detecciones en solo lectura, validar o rechazar, acceso a la revisión. |
| `ReviewViewModel` / `ReviewScreen` | `feature/review` | Revisión de boxes. |
| `ZoomableImage` | `core/platform` (`expect/actual`) | Imagen con zoom y desplazamiento que expone la transformación vigente. |
| `Route.Review(id)` | `core/navigation` | Ruta nueva. `History` y `Result(id)` ya existen en `Route.kt`. |
| Acción «Ver» del snackbar | `feature/aviso` | `AvisoSnackbar` recibe un callback que navega a `Result(analisisId)`. |

Los ViewModels se registran con `viewModelOf` en Koin. `ReviewViewModel` y `ResultViewModel` reciben el id por parámetro de ruta.

### 2. Roles

| Rol | Lista | Detalle | Imagen y boxes | Validar y revisar |
|-----|-------|---------|----------------|-------------------|
| ADMIN, AGRONOMO | sí | sí | sí | sí |
| PRODUCTOR | sí | solo datos | no | no |
| MONITOR | no | no | no | no |

- Home muestra la entrada a la lista solo si el rol no es MONITOR.
- El PRODUCTOR ve el detalle sin imagen ni botones, con una nota de que la imagen no está disponible para su rol. La app no llama a `/image` ni a `/detections` para ese rol.
- Un 403 inesperado se trata como error con «volver», no como cierre de sesión.

### 3. Lista (`History`)

- `GET analyses` paginado; la página se pide al acercarse al final.
- Filtro de estado (`pendiente` por defecto, `validado`, `rechazado`, `todos`) y filtro de campo (con los campos de `CamposRepository`).
- Cada fila: campo, fecha, estado y total de elementos detectados.
- Tirar para refrescar. Estados de carga, vacío y error con reintento (`RubusLoadingState`, `RubusErrorState`).
- Tocar una fila abre `Result(id)`.

### 4. Detalle (`Result`)

- Datos de `GET analyses/:id`: métricas (totales, sanos, enfermos, merma, peso sano), campo, fecha, estado de validación, observaciones y las etapas fenológicas del modelo.
- ADMIN y AGRONOMO: se pide `/image` y se dibuja con las detecciones de `/detections` encima, en solo lectura y con color por etapa.
- La URL firmada caduca a los 15 min. Si Coil falla, se pide una nueva una vez; si vuelve a fallar, estado de error con reintento. No se guarda la URL entre sesiones.
- Acciones para ADMIN y AGRONOMO:
  - **Validar:** `PATCH validate` con `validado`, tras confirmación.
  - **Rechazar:** diálogo con observaciones obligatorias; `PATCH validate` con `rechazado`.
  - **Revisar detecciones:** abre `Review(id)`.
- Si el análisis ya está validado o rechazado, se muestran el estado y las observaciones, y las acciones de validar y rechazar quedan deshabilitadas. «Revisar detecciones» sigue disponible.
- Tras validar o rechazar, el detalle se recarga y la lista se invalida.

### 5. Aviso

`AvisoSnackbar` muestra «¡Análisis listo!» con la acción «Ver». Pulsarla navega a `Result(analisisId)`. El aviso sigue limpiándose al cerrar sesión (2b). Pulsar «Ver» descarta ese aviso.

### 6. Revisión de boxes (`Review`)

#### Modelo de guardado

Cada corrección se guarda al confirmarla, sin borrador global:

| Acción del usuario | Llamada |
|--------------------|---------|
| Mover o redimensionar, cambiar etapa o salud | `POST detections/:id/feedback` con `EDITAR` (`bbox`, `etapaCorregida`, `saludCorregida`) |
| Eliminar | `POST detections/:id/feedback` con `ELIMINAR` |
| Agregar | `POST detections` con `etapa`, `sano`, `bbox` |
| Marcar revisado | `PATCH review` |

El servidor acumula el feedback y manda el más reciente, así que repetir «Confirmar» tras un fallo es seguro. Marcar revisado no condiciona lo corregido.

#### Estado (`ReviewViewModel`)

- Detecciones resueltas por el servidor (se excluyen las `eliminada`), imagen con su ancho y alto.
- Modo: `Navegar` (por defecto), `Editar(id)` o `Dibujar`.
- Borrador del box en edición o dibujo (local, no se manda hasta Confirmar).
- Indicador de guardado en curso: bloquea nuevas acciones mientras dura.
- Mensaje de error del último intento, con reintento.
- Tras cada guardado correcto se vuelve a pedir `/detections` y el modo vuelve a `Navegar`.

#### Gestos

- `Navegar`: tocar un box lo elige y pasa a `Editar(id)`.
- `Editar`: arrastrar dentro del box lo mueve; las cuatro asas de esquina lo redimensionan. Tocar fuera cancela el borrador (con confirmación si hay cambios).
- `Dibujar`: arrastrar crea un box; al soltar se abre la hoja de etapa y salud.
- Pellizco (zoom) y arrastre con dos dedos (desplazamiento) funcionan en cualquier modo; un dedo solo edita.
- Las asas y el área táctil de un box miden al menos 48 dp en pantalla, aunque el box sea más pequeño.

#### Hoja inferior

Selector de etapa (siete etapas), interruptor sano/enfermo y botones **Confirmar**, **Eliminar** (con confirmación) y **Cancelar**. Para un box recién dibujado no hay Eliminar.

#### Coordenadas (`BoxTransform`)

- El servidor guarda los boxes en píxeles de la imagen original. `AnalysisImage` trae ese ancho y alto.
- Una sola transformación (escala de ajuste × zoom, más desplazamiento) lleva pantalla a imagen y viceversa; es pura y probada.
- Antes de enviar: se limita el box a `[0, ancho] × [0, alto]`, se garantiza `x1 < x2` y `y1 < y2`, y se rechaza uno menor de 8 px en la imagen original (se avisa «el box es demasiado pequeño»).

#### Errores

- Imagen: como en el detalle (renovar la URL una vez, luego error con reintento).
- Guardado: el borrador se conserva y se muestra el error con reintento. No se pierde lo dibujado.
- 400 de bbox inválido: «el box no es válido».
- 403 o 404: pantalla de error con «volver».
- Marcar revisado fallido: error con reintento; el estado de las detecciones no cambia.

#### Rotación y muerte de proceso

Se conservan el id del análisis, el modo, el id del box en edición y el borrador con `rememberSaveable` y un `Saver` explícito, como en la captura. Lo ya guardado se vuelve a pedir al servidor.

### 7. Plataforma

- **Coil 3** (con su motor Ktor) vuelve al build; se quitó al cerrar la Fase 0. Carga la URL firmada.
- **Android:** `ZoomableImage` usa gestos de transformación de Compose (`detectTransformGestures`) y expone la transformación vigente a `BoxTransform`.
- **iOS:** el código común compila; `ZoomableImage` tiene en iOS una implementación mínima sin zoom, y la revisión de boxes real en iOS queda para la Fase 9.
- Sin permisos nuevos.

### 8. Seguridad

- La app no registra cuerpos de respuesta ni la URL firmada.
- La URL firmada solo vive en memoria y no se persiste.
- Los controles de ADMIN/AGRONOMO se ocultan según el rol del usuario de sesión, pero la autorización real es del servidor.

### 9. Pruebas

- **Puras:** `BoxTransform` (ida y vuelta, zoom, desplazamiento, `clamp`, tamaño mínimo, `x1 < x2`).
- **Repositorio:** contra `MockEngine` de Ktor, con la forma real de las respuestas del backend (paginación, detección resuelta, errores 400, 403, 404).
- **ViewModels:** `HistoryViewModel` (filtros, paginación, errores), `ResultViewModel` (roles, validar y rechazar, URL caducada) y `ReviewViewModel` (cada acción de guardado, modos, borrador conservado al fallar, reintento) con repositorio falso.
- **Compose (Robolectric, como `CaptureScreenTest`):** lista, detalle por rol, hoja inferior, diálogo de rechazo, acción «Ver» del aviso.
- **Grafo Koin:** `KoinGraphTest` resuelve los tres ViewModels nuevos.
- **iOS:** compilación de `compileKotlinIosSimulatorArm64`, `compileKotlinIosArm64` y `compileTestKotlinIosSimulatorArm64`.
- **Manual en el teléfono:** los gestos con el dedo (mover, asas, dibujar, zoom con pellizco) no se prueban bien en Robolectric. Lista de comprobación en el plan.

## Riesgos

- **Gestos táctiles.** Es la parte más difícil de acertar y solo se valida en un dispositivo real. Se aísla la matemática en `BoxTransform` para probarla sin dispositivo.
- **Conflicto de gestos** entre editar un box y mover la vista. Se resuelve con la regla un dedo / dos dedos; si no basta, se evalúa un modo explícito de «mover vista».
- **Tamaño de la pantalla.** La referencia web tiene 940 líneas en Flutter; la nueva debe repartirse en archivos pequeños (`ReviewScreen`, hoja, overlay, `BoxTransform`).
- **Memoria.** La variante de despliegue llega a 2048 px; Coil la reduce al tamaño de pantalla, pero el zoom necesita la resolución completa. Se verifica en un teléfono de gama media.
- **URL caducada** durante una sesión larga de edición: se renueva una vez; si falla, se conserva el borrador.
- **Sin dedupe en el servidor.** Un `POST detections` repetido tras una respuesta perdida crea un box duplicado (a diferencia del feedback, que es idempotente en efecto). Se aísla el reintento a un solo intento manual y se anota como pendiente.

## Documentación que se actualiza

- `rubus-ai-kmp/docs/roadmap-migracion-kmp.md`: estado de la 2c.
- `rubus-ai-kmp/docs/dependencias-pendientes.md`: sección «Pendientes de la Fase 2c» (iOS sin zoom, duplicado en `POST detections`, el gesto de movimiento de vista si se cambia, los menores que queden) y la vuelta de Coil 3 al build.
