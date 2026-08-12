# Diseño: Captura de Detecciones y Corrección Humana (Feedback del Modelo)

**Fecha:** 2026-08-11
**Feature:** Captura de bounding boxes del modelo YOLOv8, tabla `ModelFeedback`, y pantalla de revisión de detecciones en zarza-web.

---

## Resumen

Hoy el modelo YOLOv8 (`fruit-inference`) calcula un bounding box y un score de confianza por cada fruto que detecta, pero los descarta de inmediato: solo persisten conteos agregados por etapa fenológica (`FenologiaEtapa`). Esto hace imposible que un agrónomo corrija una detección puntual, y deja al sistema sin ningún mecanismo para acumular datos de corrección reutilizables en un futuro reentrenamiento.

Este spec cubre la **primera de dos fases** del mecanismo de corrección descrito en el roadmap (sección "Pipeline de reentrenamiento del modelo con feedback humano"): capturar las detecciones individuales, y dar a `AGRONOMO`/`ADMIN` una pantalla para corregirlas (cambiar etapa, marcar enfermo/sano, eliminar falsos positivos, agregar detecciones que faltaron). **No cubre** el pipeline de reentrenamiento en sí (fine-tuning, versionado de modelos, validación pre-producción) — eso queda para un segundo spec, una vez que exista feedback acumulado con el que trabajar.

Aplica solo a análisis generados **después** de este cambio. Los análisis históricos, que nunca tuvieron bounding boxes, siguen usando el flujo de validación agregada que ya existe (`Analysis.validacionEstado` / `cronograma_corregido`) — ese flujo no se modifica.

---

## 1. Modelo de Datos

Cambios en `packages/database/prisma/schema.prisma`.

### Enums nuevos

```prisma
enum OrigenDeteccion {
  MODELO
  HUMANO
}

enum EstadoSalud {
  SANO
  ENFERMO
}

enum AccionFeedback {
  EDITAR
  ELIMINAR
}
```

### `Detection` (nueva) — salida del modelo, o detección agregada por un humano

Una fila por cada fruto detectado. Es la única fuente de verdad de "qué frutos existen" en un análisis; nunca se muta directamente.

```prisma
model Detection {
  id             String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  analysisId     String          @map("analysis_id") @db.Uuid
  origen         OrigenDeteccion @default(MODELO)
  claseDetectada String?         @map("clase_detectada")
  etapaDetectada String          @map("etapa_detectada")
  saludDetectada EstadoSalud     @default(SANO) @map("salud_detectada")
  confidence     Float?
  bboxX1         Float           @map("bbox_x1")
  bboxY1         Float           @map("bbox_y1")
  bboxX2         Float           @map("bbox_x2")
  bboxY2         Float           @map("bbox_y2")
  creadoPorId    String?         @map("creado_por_id") @db.Uuid
  createdAt      DateTime        @default(now()) @map("created_at")

  analysis  Analysis        @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  creadoPor User?           @relation(fields: [creadoPorId], references: [id])
  feedback  ModelFeedback[]

  @@index([analysisId])
  @@map("detections")
}
```

- `origen: MODELO` — creada por `fruit-ms` al persistir el análisis. `confidence` viene de YOLO, `creadoPorId` es nulo.
- `origen: HUMANO` — creada por el endpoint de "agregar detección" cuando el modelo no detectó un fruto. `confidence` es nulo, `creadoPorId` es el agrónomo que la agregó.
- Coordenadas de bbox en píxeles de la imagen original (mismo sistema que usa `yolo_client.py` internamente).

### `ModelFeedback` (nueva) — bitácora append-only de correcciones

Una fila por cada acción de corrección sobre una `Detection` existente (de cualquier origen). Nunca se actualiza ni se borra — el estado "actual" de una detección se resuelve tomando el `ModelFeedback` más reciente por `detectionId`, si existe.

```prisma
model ModelFeedback {
  id             String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  analysisId     String         @map("analysis_id") @db.Uuid
  detectionId    String         @map("detection_id") @db.Uuid
  accion         AccionFeedback
  etapaCorregida String?        @map("etapa_corregida")
  saludCorregida EstadoSalud?   @map("salud_corregida")
  bboxX1         Float?         @map("bbox_x1")
  bboxY1         Float?         @map("bbox_y1")
  bboxX2         Float?         @map("bbox_x2")
  bboxY2         Float?         @map("bbox_y2")
  observaciones  String?
  creadoPorId    String         @map("creado_por_id") @db.Uuid
  createdAt      DateTime       @default(now()) @map("created_at")

  analysis  Analysis  @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  detection Detection @relation(fields: [detectionId], references: [id], onDelete: Cascade)
  creadoPor User      @relation(fields: [creadoPorId], references: [id])

  @@index([analysisId])
  @@index([detectionId, createdAt(sort: Desc)])
  @@map("model_feedback")
}
```

- `analysisId` está denormalizado (ya se puede llegar a él vía `detection.analysisId`) para poder filtrar/contar feedback por análisis sin join.
- `accion: EDITAR` requiere `etapaCorregida` y/o `saludCorregida` (al menos uno); `bboxX1..Y2` opcional si también se reposicionó la caja.
- `accion: ELIMINAR` no requiere ningún campo corregido — solo marca la detección como falso positivo. La `Detection` original nunca se borra (queda como dato de entrenamiento negativo).

### `Analysis` — 3 columnas nuevas

```prisma
deteccionesRevisadas      Boolean   @default(false) @map("detecciones_revisadas")
deteccionesRevisadasPorId String?   @map("detecciones_revisadas_por_id") @db.Uuid
deteccionesRevisadasAt    DateTime? @map("detecciones_revisadas_at")

detections               Detection[]
modelFeedback            ModelFeedback[]
deteccionesRevisadasPor  User?  @relation("AnalysisDeteccionesRevisadas", fields: [deteccionesRevisadasPorId], references: [id])
```

Se ponen en `true`/usuario/fecha automáticamente la primera vez que se guarda una `Detection` de origen humano o un `ModelFeedback` para ese análisis, o manualmente vía el botón "Marcar como revisado, sin cambios".

### `User` — relaciones inversas

Se agregan `detectionsCreadas Detection[]`, `modelFeedbackCreado ModelFeedback[]`, `analysesDeteccionesRevisadas Analysis[] @relation("AnalysisDeteccionesRevisadas")`.

---

## 2. `fruit-inference` — captura de bbox y confidence

`domain/analysis.py` (`build_report`) hoy usa `det["bbox"]` solo como argumento efímero a `calcular_peso_visual(...)` y lo descarta en la misma iteración. Cambio: agregar un array `detecciones` al dict de retorno, un objeto por cada detección de YOLO:

```json
{
  "...": "...",
  "detecciones": [
    { "clase": "naranja", "etapa": "naranja", "sano": true, "confidence": 0.87, "bbox": [120.5, 340.2, 210.8, 430.1] }
  ]
}
```

- Campo aditivo a la respuesta existente de `POST /analyze` — no rompe el contrato actual, no requiere flag ni endpoint nuevo.
- `etapa` y `sano` se derivan de `CLASS_MAP[clase]`, igual que ya se hace para el resto del reporte.
- `bbox` en píxeles de la imagen original: `[x1, y1, x2, y2]`.
- Tests de `domain/analysis.py` se extienden para cubrir que `detecciones` venga con la longitud y estructura correctas.

---

## 3. `fruit-ms` — persistencia de `Detection`

- `dto/analysis-response.dto.ts`: nuevo `DeteccionDto { clase, etapa, sano, confidence, bbox: [number, number, number, number] }`, y campo `detecciones: DeteccionDto[]` en la respuesta de inferencia.
- `infrastructure/inference.mapper.ts`: mapea `detecciones` hacia un nuevo campo `detecciones: DetectionDomain[]` en `AnalysisDomain`, en paralelo al mapeo existente de `cronograma_fenologico`.
- `infrastructure/analysis.prisma.repository.ts`: al persistir el `Analysis`, crea también las filas `Detection` asociadas (`origen: MODELO`) en la misma transacción, una por cada elemento de `detecciones`.

Esto ocurre automáticamente para **todo análisis nuevo**, sin depender de que alguien abra la pantalla de revisión — es la única forma de que los datos existan cuando se necesiten. Implica más filas en la base de datos (una por fruto detectado en vez de una por etapa agregada), pero dado el volumen típico de frutos por imagen (decenas), no se anticipa problema de escala; queda como algo a vigilar si el volumen de imágenes crece mucho.

---

## 4. `fruit-backend` — API

Todos los endpoints bajo `@Roles(Role.AGRONOMO, Role.ADMIN)`, con el mismo scope por campo/productor que ya aplica `AnalysesController.findOne` (404 si un `AGRONOMO` no tiene el campo asignado; `PRODUCTOR` no tiene acceso a ninguno de estos endpoints).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/analyses/:id/detections` | Devuelve las detecciones del análisis con su estado actual ya resuelto (original si no tiene feedback, o el `ModelFeedback` más reciente por `detectionId`) |
| `POST` | `/analyses/:id/detections` | Crea una `Detection` con `origen: HUMANO` (caso "faltó una detección"). Body: `{ etapa, sano, bbox: [x1,y1,x2,y2] }` |
| `POST` | `/analyses/:id/detections/:detectionId/feedback` | Crea un `ModelFeedback`. Body: `{ accion: 'EDITAR' \| 'ELIMINAR', etapaCorregida?, saludCorregida?, bbox?, observaciones? }` |
| `PATCH` | `/analyses/:id/review` | Marca `deteccionesRevisadas = true` explícitamente (botón "Marcar como revisado"); idempotente |

`GET /analyses` (existente) se extiende con un query param opcional `revision_detecciones?: 'pendiente' | 'revisado' | 'all'`, independiente del `estado` (validación agregada) que ya existe — son dos flujos de vida distintos sobre el mismo análisis y no se cruzan.

No se agrega notificación WebSocket para estas acciones (a diferencia de `PATCH /:id/validate`, que sí notifica al productor): este es un flujo interno de QA/entrenamiento, no un resultado que el productor necesite ver en tiempo real.

### Validación de DTOs

- `bbox`: 4 números no negativos, con `x1 < x2` y `y1 < y2`. El sistema no almacena el ancho/alto de la imagen original en ningún punto del pipeline actual, así que no se valida que la caja quede dentro de esos límites — queda como responsabilidad del componente de dibujo en el frontend, que sí conoce las dimensiones renderizadas.
- `etapa` en `POST /detections` y `etapaCorregida` en el feedback: deben ser una de las etapas conocidas de `CLASS_MAP` (lista fija, no arbitraria).
- `accion` limitado a `EDITAR | ELIMINAR`.

---

## 5. `zarza-web` — UI

### Cola de revisión — `/revision-detecciones`

Ruta nueva, protegida para `AGRONOMO`/`ADMIN` en `App.tsx`, con enlace en el sidebar existente (`AppShell`). Tabla simple (mismo patrón que `AnalysesPage`) que llama a `GET /analyses?revision_detecciones=pendiente`, ordenada por fecha de análisis descendente. Cada fila tiene un botón "Revisar" que navega a la pantalla de detalle.

### Pantalla de revisión — `/analisis/:id/revision-detecciones`

Layout de una columna, imagen arriba a todo el ancho, tira de detecciones abajo:

- **Imagen con overlay:** componente propio (SVG posicionado absoluto sobre el `<img>`, escalando coordenadas de píxeles originales al tamaño renderizado — sin librerías de canvas/anotación de terceros). Color de borde = etapa; relleno rojo translúcido = marcada enferma; opacidad reducida + tachado = eliminada. Clic en una caja la selecciona.
- **Botón "+ Agregar detección":** activa modo dibujo; el agrónomo arrastra un rectángulo nuevo sobre la imagen, lo que abre el panel de corrección para asignarle etapa/salud antes de confirmar (`POST /analyses/:id/detections`).
- **Tira horizontal de tarjetas** (una por detección): etapa, sano/enfermo, badge de confidence del modelo si `origen: MODELO`, o "agregado manualmente" si `origen: HUMANO`. Selección sincronizada en ambas direcciones con las cajas de la imagen.
- **Panel flotante de corrección** (al seleccionar una detección): `Select` de etapa (limitado a las clases de `CLASS_MAP`), toggle sano/enfermo, botón "Eliminar detección", botón "Guardar". Guardado incremental — cada acción persiste al instante contra el backend correspondiente, con `message.success`/`message.error` de Ant Design.
- **Botón fijo "Marcar como revisado, sin cambios":** `PATCH /analyses/:id/review`, siempre visible y habilitado (incluso si ya hay correcciones guardadas).

Se agrega además un botón "Revisar detecciones →" dentro de `AnalisisDetailModal.tsx` (visible para `AGRONOMO`/`ADMIN`) que navega a esta pantalla, para no obligar a pasar siempre por la cola dedicada.

### Hooks nuevos (`zarza-web/src/revision-detecciones/`)

```ts
useDetecciones(analysisId)                        // GET /analyses/:id/detections
useAgregarDeteccion()                             // POST /analyses/:id/detections
useFeedbackDeteccion()                             // POST /analyses/:id/detections/:detectionId/feedback
useMarcarRevisado()                                // PATCH /analyses/:id/review
useColaRevision()                                  // GET /analyses?revision_detecciones=pendiente
```

---

## 6. Manejo de Errores

### Backend
- 404 en scope: mismo comportamiento que `findOne` para `PRODUCTOR` ajeno o `AGRONOMO` fuera de su campo asignado, aplicado a los 4 endpoints nuevos.
- Ediciones concurrentes (dos agrónomos revisando el mismo análisis a la vez) no requieren locking: al ser append-only, ambas correcciones quedan guardadas como filas separadas de `ModelFeedback`; la más reciente gana para "estado actual", sin pérdida de datos.
- Eliminar una detección ya eliminada es idempotente — se acepta, genera otra fila `ModelFeedback`, sin efecto adicional visible.
- Validación de DTO (bbox, etapa, acción) vía `class-validator`, igual que el resto de `fruit-backend`.

### Frontend
- Cada mutación (agregar, feedback, marcar revisado) muestra `message.error` con el mensaje del servidor si falla, y no descarta el resto de correcciones ya guardadas (guardado incremental, no hay un submit atómico que pueda fallar a medias).
- Overlay de imagen con skeleton de carga y placeholder si la imagen o las detecciones no cargan, reutilizando el patrón ya existente en `AnalisisDetailModal.tsx`.

---

## 7. Testing

- `fruit-inference`: extender tests de `domain/analysis.py` para cubrir `detecciones` (estructura, longitud, mapeo clase→etapa/sano).
- `fruit-ms`: extender tests de `inference.mapper.ts` y del repositorio Prisma para cubrir mapeo y persistencia de `Detection`.
- `fruit-backend`: tests unitarios de los 4 endpoints nuevos (scope por rol/campo, validación de DTOs, idempotencia de `ELIMINAR` y de `PATCH /review`), siguiendo el patrón de cobertura real que ya existe en el proyecto (no plantillas).
- `zarza-web`: no hay suite de tests documentada en este proyecto (ver `CLAUDE.md`); verificación manual con el dev server durante la implementación, cubriendo el flujo completo (agregar, editar, eliminar, marcar revisado) y los tres roles relevantes (`AGRONOMO`, `ADMIN`, y confirmar que `PRODUCTOR` no tiene acceso).

---

## 8. Explícitamente Fuera de Alcance

- Pipeline de fine-tuning de YOLO, versionado de modelos (`best_v2.pt`, `best_v3.pt`…) y validación de un modelo nuevo antes de producción — spec separado, futuro, una vez haya feedback acumulado.
- Backfill de análisis históricos sin detecciones (solo aplica a análisis generados después de este cambio).
- Taxonomía de tipos específicos de enfermedad/plaga — solo estado binario `SANO`/`ENFERMO`.
- Notificaciones en tiempo real (WebSocket/push) de correcciones de detección.
- Priorización de la cola de revisión por confidence del modelo — solo fecha descendente + filtro pendiente/revisado.

---

## 9. Archivos a Crear / Modificar

### `packages/database`
- `prisma/schema.prisma` — modelos `Detection`, `ModelFeedback`, enums, columnas nuevas en `Analysis`, relaciones inversas en `User`.
- Nueva migración vía `pnpm run migrate:dev --name add_detection_feedback`.

### `fruit-inference`
- `domain/analysis.py` — agregar `detecciones` al retorno de `build_report`.
- `tests/` — extender cobertura de `build_report`.

### `fruit-ms`
- `src/fruits/dto/analysis-response.dto.ts` — `DeteccionDto`, campo `detecciones`.
- `src/fruits/domain/analysis.domain.ts` (o equivalente) — campo `detecciones` en `AnalysisDomain`.
- `src/fruits/infrastructure/inference.mapper.ts` — mapeo de `detecciones`.
- `src/fruits/infrastructure/analysis.prisma.repository.ts` — persistencia de `Detection` junto al `Analysis`.

### `fruit-backend`
- `src/analyses/dto/` — DTOs nuevos: crear detección, feedback de detección.
- `src/analyses/analyses.controller.ts` — 4 endpoints nuevos.
- `src/analyses/analyses.service.ts` — lógica de resolución de estado actual, creación de `Detection`/`ModelFeedback`, marcado automático de `deteccionesRevisadas`.
- `src/analyses/dto/list-analyses-query.dto.ts` — query param `revision_detecciones`.

### `zarza-web`
- `src/revision-detecciones/ColaRevisionPage.tsx` — nuevo.
- `src/revision-detecciones/RevisionDeteccionesPage.tsx` — nuevo (imagen + overlay + tira + panel).
- `src/revision-detecciones/DeteccionOverlay.tsx` — nuevo (componente SVG de cajas).
- `src/revision-detecciones/useDetecciones.ts` — nuevo (hooks React Query).
- `src/revision-detecciones/types.ts` — nuevo.
- `src/analisis/AnalisisDetailModal.tsx` — agregar botón "Revisar detecciones →".
- `src/App.tsx` — agregar rutas `/revision-detecciones` y `/analisis/:id/revision-detecciones`.
- `src/shared/AppShell.tsx` — agregar enlace en sidebar.
