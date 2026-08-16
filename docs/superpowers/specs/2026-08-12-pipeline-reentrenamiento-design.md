# Diseño: Pipeline de Reentrenamiento del Modelo con Feedback Humano

**Fecha:** 2026-08-12
**Feature:** Exportar el feedback acumulado (`Detection`/`ModelFeedback`) a formato de entrenamiento YOLO, hacer fine-tuning del modelo, versionar los resultados y dar a `ADMIN` una pantalla para promoverlos a producción.

---

## Resumen

La fase 1 ([[2026-08-11-deteccion-feedback-design]]) le dio a `AGRONOMO`/`ADMIN` una pantalla para corregir las detecciones de YOLOv8 (etapa, sano/enfermo, falsos positivos, detecciones faltantes), acumulando correcciones en `Detection`/`ModelFeedback`. Hoy ese feedback no se usa para nada más que mostrarse en pantalla.

Este spec cubre la **segunda de dos fases**: convertir ese feedback acumulado en un dataset de entrenamiento, correr fine-tuning sobre el modelo base (`best.pt`), evaluar el resultado, y darle a `ADMIN` control explícito sobre cuándo promover una versión nueva a producción.

Incluye, de punta a punta: exportación de dataset → entrenamiento → versionado → validación automática con umbral → promoción manual (con posibilidad de rollback a cualquier versión anterior).

**Decisión de producto importante:** el modelo actual (`CLASS_MAP`) no tiene ninguna clase de enfermedad — todas sus 6 clases son etapas fenológicas sanas. Este spec agrega una séptima clase genérica `enfermo` (independiente de la etapa) para que el modelo reentrenado pueda aprender a detectar enfermedad a partir del feedback `saludCorregida=ENFERMO` acumulado en la fase 1.

---

## 1. Arquitectura de Servicios

Un servicio nuevo, dos servicios modificados:

```
fruit-backend  ──POST /train (async)──>  fruit-training (nuevo)
     ^                                          │
     │                                          │ GET /internal/training/dataset
     │  POST /internal/training-complete        │ (imágenes + detecciones resueltas)
     └──────────────────────────────────────────┘
     │
     │ (al promover)
     │ descarga .pt de R2, escribe en volumen montado,
     ▼
fruit-inference  <──POST /internal/prepare-restart── fruit-backend
     │
     └─ os._exit(0) → Docker (restart: unless-stopped) relanza el contenedor
                        → lifespan recarga el best.pt nuevo
```

- **`fruit-training`** (nuevo, Python/FastAPI, mismo esqueleto que `fruit-inference` pero sin exposición pública — solo red interna Docker): expone `POST /train` con token compartido nuevo (`TRAINING_INTERNAL_TOKEN`). Corre en un contenedor separado de `fruit-inference` para que un entrenamiento largo (horas en CPU) no compita por CPU con la inferencia en producción.
- **`fruit-backend`**: nuevos endpoints ADMIN-only para gestionar el ciclo de vida, más 2 endpoints internos consumidos solo por `fruit-training`. Sigue siendo la única fuente de acceso a Postgres (vía Prisma) — `fruit-training` nunca toca la base de datos directamente, solo consume HTTP.
- **`fruit-inference`**: nuevo endpoint interno `POST /internal/prepare-restart`. Requiere agregar `restart: unless-stopped` a su definición en `docker-compose.yml` (hoy no tiene política de reinicio configurada, así que sin este cambio el auto-reinicio tras promoción no funcionaría).

**Cómputo:** se asume CPU-only para el diseño (la infra actual no tiene GPU). `ultralytics` detecta CUDA automáticamente si en el futuro el servidor migra a un VPS con GPU (ej. Hostinger AI/GPU), sin cambios de código en `fruit-training`.

---

## 2. Modelo de Datos

Cambios en `packages/database/prisma/schema.prisma`.

```prisma
enum TrainingJobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum ModelVersionStatus {
  ENTRENADO           // job completó, mAP calculado, aún sin comparar
  LISTO_PARA_PROMOVER // mAP nuevo > mAP del modelo activo (o es el primer job)
  DESCARTADO          // mAP nuevo <= mAP del modelo activo, no promovible
  PROMOVIDO           // activo en producción actualmente
  REEMPLAZADO         // fue PROMOVIDO, luego se promovió otra versión encima
}

model TrainingJob {
  id            String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  status        TrainingJobStatus @default(PENDING)
  datasetSize   Int?              @map("dataset_size")
  errorMessage  String?           @map("error_message")
  iniciadoPorId String            @map("iniciado_por_id") @db.Uuid
  iniciadoAt    DateTime          @default(now()) @map("iniciado_at")
  finalizadoAt  DateTime?         @map("finalizado_at")

  iniciadoPor  User          @relation(fields: [iniciadoPorId], references: [id])
  modelVersion ModelVersion?

  @@map("training_jobs")
}

model ModelVersion {
  id             String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  version        Int                 @unique
  r2Key          String?             @map("r2_key")
  mAP            Float?
  mAPBase        Float?              @map("map_base")
  status         ModelVersionStatus  @default(ENTRENADO)
  trainingJobId  String              @unique @map("training_job_id") @db.Uuid
  promovidoPorId String?             @map("promovido_por_id") @db.Uuid
  promovidoAt    DateTime?           @map("promovido_at")
  createdAt      DateTime            @default(now()) @map("created_at")

  trainingJob  TrainingJob @relation(fields: [trainingJobId], references: [id])
  promovidoPor User?       @relation(fields: [promovidoPorId], references: [id])

  @@map("model_versions")
}
```

`mAPBase` guarda el mAP del modelo que sirvió de punto de partida para ese job, evaluado contra el mismo split de validación — es la cifra contra la que se compara `mAP` para decidir `LISTO_PARA_PROMOVER`/`DESCARTADO` (ver sección 4).

`User` gana dos relaciones inversas: `trainingJobsIniciados TrainingJob[]`, `modelVersionsPromovidas ModelVersion[]`.

---

## 3. Exportación de Dataset (`fruit-training`)

**Alcance del dataset:** todo `Analysis` con `deteccionesRevisadas=true` (fase 1). Por cada `Detection` de esos análisis:
- Si el último `ModelFeedback` es `ELIMINAR` → se excluye del dataset.
- Si el último `ModelFeedback` es `EDITAR` → se usa `etapaCorregida`/`saludCorregida`/`bbox` corregidos.
- Si no hay feedback → se usa el valor original del modelo (revisado implícitamente: un humano vio la imagen completa y no la tocó).

Esta es la misma lógica de `resolveDetectionState()` que ya usa `AnalysesService` en la fase 1.

**Flujo:**

1. `fruit-training` recibe `POST /train { jobId, callbackUrl }` de `fruit-backend`, responde `202` de inmediato y continúa en background.
2. `GET fruit-backend/internal/training/dataset` (token `TRAINING_INTERNAL_TOKEN`) → devuelve, por análisis revisado, la URL presignada de la imagen (vía el `StoragePort` existente) + las detecciones ya resueltas:
   ```json
   [
     {
       "imageUrl": "https://...",
       "detecciones": [
         { "clase": "naranja", "sano": true, "bbox": [120.5, 340.2, 210.8, 430.1] }
       ]
     }
   ]
   ```
3. `fruit-training` descarga cada imagen, lee sus dimensiones reales (PIL) y normaliza cada bbox a formato YOLO (`class_id x_center y_center width height`, 0–1). El mapeo clase → `class_id` usa una copia local de `CLASS_MAP` con las 7 clases (ver sección 5); si `sano=false` la caja se etiqueta como `enfermo` sin importar la etapa detectada.
4. Split 80/20 train/val, aleatorio con semilla = hash de `jobId` (reproducible dentro de ese job, distinto entre jobs — ver sección 4 sobre por qué el mAP no es 100% comparable entre versiones bajo este esquema, y por qué eso es aceptable para esta primera versión del pipeline).
5. Genera la estructura de carpetas que espera `ultralytics` (`images/train`, `images/val`, `labels/train`, `labels/val`, `data.yaml`) en un directorio temporal.

Si una imagen es inaccesible en R2 (borrada, URL vencida), esa entrada se omite del dataset con un log de advertencia — no aborta el job completo.

---

## 4. Entrenamiento y Validación (`fruit-training`)

**Modelo base:** el `.pt` del `ModelVersion` actualmente `PROMOVIDO`, descargado de R2. Si no existe ninguno (primer job del sistema), se usa el `best.pt` original montado en `fruit-inference`.

**Fine-tuning:**
```python
YOLO(base_model_path).train(
    data="data.yaml",
    epochs=TRAINING_EPOCHS,   # env var, default 50
    imgsz=640,
    patience=10,               # early stopping
)
```

**Evaluación:** al terminar, se calcula `mAP@0.5` del modelo nuevo contra el split de validación. Para que la comparación sea justa (mismo split para ambos), **también se evalúa el modelo base contra ese mismo split** — esa cifra es `mAPBase`. Esto evita depender de un mAP histórico calculado con un split distinto, y hace que incluso el primer job del sistema tenga una comparación real en vez de auto-promoverse a ciegas.

**Resultado:**
- `mAP > mAPBase` → `ModelVersion.status = LISTO_PARA_PROMOVER`.
- `mAP <= mAPBase` → `ModelVersion.status = DESCARTADO` (no se puede promover, queda en el historial como referencia).

**Reporte a `fruit-backend`:**
- Éxito: sube `best_v{N}.pt` a R2 (prefijo `models/`), luego `POST /internal/training-complete { jobId, status: COMPLETED, mAP, mAPBase, r2Key, datasetSize }`. `fruit-backend` crea el `ModelVersion` con el status ya resuelto.
- Falla (cualquier excepción durante export/entrenamiento/evaluación): `POST /internal/training-complete { jobId, status: FAILED, errorMessage }`. No se crea `ModelVersion`.

**Timeout de jobs colgados:** si `fruit-training` crashea sin reportar, el `TrainingJob` quedaría `RUNNING` para siempre. En vez de un cron nuevo, `GET /training/status` (sección 6) hace un chequeo perezoso: si el job activo lleva más de `TRAINING_JOB_TIMEOUT_HOURS` (env var, default 6) en `RUNNING`, se marca `FAILED` con `errorMessage: "timeout"` en esa misma lectura, liberando el lock de "un job a la vez".

---

## 5. Sincronización de `CLASS_MAP` entre `fruit-inference` y `fruit-training`

El orden y contenido de las clases debe ser idéntico en ambos servicios — si se desincronizan, las predicciones de `fruit-inference` se interpretarían con el mapeo equivocado.

`fruit-training` tiene su propia copia de `model_config.py` con las 7 clases:
```python
CLASS_MAP: dict[str, dict] = {
    "boton":     {"etapa": "boton",         "sano": True},
    "flor":      {"etapa": "flor",          "sano": True},
    "verde":     {"etapa": "verde",         "sano": True},
    "naranja":   {"etapa": "naranja",       "sano": True},
    "marron":    {"etapa": "marron",        "sano": True},
    "maduro":    {"etapa": "maduro",        "sano": True},
    "zarzamora": {"etapa": "deteccion_gen", "sano": True},
    "enfermo":   {"etapa": None,            "sano": False},
}
```
Se agrega un test (`fruit-training/tests/test_class_map_sync.py`) que compara este diccionario contra el de `fruit-inference/model_config.py` importado directamente (ambos proyectos ya conviven en el mismo monorepo/checkout) y falla si difieren en claves o en orden. No se introduce un paquete Python compartido nuevo — duplicar con un test de consistencia es suficiente para el volumen de cambio esperado en este mapeo.

`fruit-inference/model_config.py` también gana la clase `enfermo`. Una detección `enfermo` es una caja completa (YOLO predice una sola clase por caja, no puede ser simultáneamente "naranja" y "enfermo"), así que pierde la etapa fenológica específica de esa caja. Para no dejar `Detection.etapaDetectada` (no-nulo, definido en la fase 1) sin valor, se reutiliza la etapa genérica que ya existe para este caso (`deteccion_gen`, hoy usada por la clase `zarzamora` cuando no se distingue etapa):

```python
CLASS_MAP: dict[str, dict] = {
    "boton":      {"etapa": "boton",         "sano": True,  "peso_g": 0.1},
    "flor":       {"etapa": "flor",          "sano": True,  "peso_g": 0.2},
    "verde":      {"etapa": "verde",         "sano": True,  "peso_g": 1.8},
    "naranja":    {"etapa": "naranja",       "sano": True,  "peso_g": 3.5},
    "marron":     {"etapa": "marron",        "sano": True,  "peso_g": 4.5},
    "maduro":     {"etapa": "maduro",        "sano": True,  "peso_g": 6.0},
    "zarzamora":  {"etapa": "deteccion_gen", "sano": True,  "peso_g": 3.0},
    "enfermo":    {"etapa": "deteccion_gen", "sano": False, "peso_g": 0.0},
}
```

En `build_report`: una detección `enfermo` cuenta hacia `metricas_salud.elementos_enfermos` (campo que ya existe desde antes de la fase 1) pero no aporta a `peso_sano_total` (`peso_g: 0.0`, consistente con que fruta enferma ya se trata como merma en el resto del reporte) ni a `etapa_counts`/`cronograma_fenologico` de una etapa específica — queda contabilizada solo como "detectado, enfermo, etapa desconocida". Es una limitación conocida y aceptada del esquema de clase genérica elegido para esta fase (la alternativa de clases combinadas `naranja_enfermo`/`verde_enfermo`/etc. sí preservaría la etapa, a costa de duplicar el número de clases con poco dato inicial de enfermedad para entrenarlas todas): no se puede saber en qué etapa está un fruto enfermo a partir de una sola detección `enfermo`.

---

## 6. `fruit-backend` — API

Todos los endpoints de gestión bajo `@Roles(Role.ADMIN)` — entrenar y promover modelos es una acción operativa de alto impacto, no se comparte con `AGRONOMO` (que sigue gestionando solo la corrección de detecciones de la fase 1).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/training/status` | Modelo activo, contador de análisis revisados nuevos desde el último job, umbral mínimo, job activo (si existe), historial de `ModelVersion`/`TrainingJob` |
| `POST` | `/training/jobs` | Dispara un job nuevo. 409 si ya hay un job `PENDING`/`RUNNING`, o si el contador de análisis nuevos no alcanza el umbral |
| `POST` | `/training/jobs/:id/promote` | Promueve el `ModelVersion` asociado a ese job (debe estar en `LISTO_PARA_PROMOVER` o `REEMPLAZADO` — así el mismo endpoint cubre promoción normal y rollback a una versión anterior) |
| `GET` | `/internal/training/dataset` | Interno, token `TRAINING_INTERNAL_TOKEN`. Consumido solo por `fruit-training` |
| `POST` | `/internal/training-complete` | Interno, mismo token. Consumido solo por `fruit-training` |

**Contador de análisis nuevos:** `GET /training/status` cuenta `Analysis` con `deteccionesRevisadas=true` y `deteccionesRevisadasAt` posterior al `iniciadoAt` del último `TrainingJob` (sin importar su resultado — así un reintento tras un fallo refleja correctamente lo acumulado desde el intento anterior, no desde el último éxito). Umbral mínimo vía `TRAINING_MIN_REVIEWED_ANALYSES` (env var, default 50).

**Creación de job:** la validación de "no hay job activo" + la creación del `TrainingJob(PENDING)` ocurren en una sola transacción Prisma, evitando que un doble click cree dos jobs simultáneos. Tras crear el registro, se llama async a `fruit-training POST /train` — la respuesta al cliente (202) no espera a que el entrenamiento termine.

**Promoción (`POST /training/jobs/:id/promote`):**
1. Descarga el `.pt` de R2 (`r2Key` del `ModelVersion`).
2. Lo escribe en la ruta que `fruit-inference` tiene montada (reemplaza `fruit-inference/best.pt`).
3. Llama `POST fruit-inference/internal/prepare-restart` (reusa el token `INFERENCE_AUTH_TOKEN` ya existente).
4. Marca ese `ModelVersion` como `PROMOVIDO`; si había otro `PROMOVIDO`, pasa a `REEMPLAZADO`. Guarda `promovidoPorId`/`promovidoAt`.

Si falla la descarga de R2 o `fruit-inference` no responde al `prepare-restart`, la promoción no se marca como exitosa — el `ModelVersion` se queda en su estado previo y se devuelve el error al ADMIN para reintentar. No hay un endpoint de "rollback" separado: promover una versión `REEMPLAZADO` es la misma operación.

---

## 7. `fruit-inference` — reinicio controlado

Nuevo endpoint interno:

```
POST /internal/prepare-restart
Headers: x-inference-token: <INFERENCE_AUTH_TOKEN>
```

Responde `200` inmediatamente y, tras enviar la respuesta, llama `os._exit(0)`. Requiere agregar a `docker-compose.yml`:

```yaml
fruit-inference:
  restart: unless-stopped
  ...
```

Docker relanza el contenedor automáticamente; el `lifespan` existente (que ya carga el modelo una sola vez al arrancar) recoge el `best.pt` reemplazado sin cambios adicionales. No se necesita acceso al socket de Docker desde ningún otro servicio.

**Nota sobre el volumen:** hoy `fruit-inference` monta `./fruit-inference/best.pt` como **solo lectura** (`:ro`) y `fruit-backend` no tiene ningún volumen montado. Para que `fruit-backend` pueda escribir el `.pt` promovido en esa misma ruta del host, se le agrega un volumen propio de **escritura** sobre el mismo archivo/directorio:

```yaml
fruit-backend:
  volumes:
    - ./fruit-inference/best.pt:/app/models/active-model.pt   # sin :ro — fruit-backend escribe aquí

fruit-inference:
  volumes:
    - ./fruit-inference/best.pt:/app/model.pt:ro               # sin cambios, sigue de solo lectura
```

Ambos apuntan al mismo archivo en el host; solo `fruit-inference` lo monta de solo lectura.

---

## 8. `zarza-web` — UI

### Pantalla "Modelos IA" — `/admin/modelos-ia`

Ruta nueva, `PrivateRoute allowedRoles={[Role.ADMIN]}`, enlace nuevo en el sidebar (`AppShell`, agrupado junto a `/admin/users`). Tres tabs:

- **"Estado actual"**: modelo activo (versión, mAP, fecha de promoción), contador "N análisis revisados nuevos / umbral mínimo M", botón "Iniciar nuevo entrenamiento" (deshabilitado con tooltip si hay un job activo o no se llega al umbral).
- **"Historial de versiones"**: tabla de `ModelVersion` (versión, mAP vs. mAPBase, estado, fecha), botón "Promover" en las filas `LISTO_PARA_PROMOVER`/`REEMPLAZADO`.
- **"Jobs de entrenamiento"**: tabla de `TrainingJob` (fecha inicio, estado, duración, tamaño de dataset, mensaje de error si falló).

Polling con `react-query` (`refetchInterval` ~15s) sobre `GET /training/status` mientras haya un job `PENDING`/`RUNNING`; se detiene el polling cuando no hay job activo, igual que el resto del panel evita WebSocket para datos no críticos en tiempo real.

### Hooks nuevos (`zarza-web/src/modelos-ia/`)

```ts
useTrainingStatus()        // GET /training/status (con polling condicional)
useIniciarEntrenamiento()  // POST /training/jobs
usePromoverVersion()       // POST /training/jobs/:id/promote
```

---

## 9. Manejo de Errores

### Backend
- Los 3 endpoints ADMIN-only devuelven 403 para cualquier otro rol (guard estándar de `Roles`).
- Los 2 endpoints internos devuelven 401 con token inválido/ausente, igual que `internal-notify.controller.ts` ya hace para `fruit-ms → fruit-backend`.
- `POST /training/jobs` con job activo o por debajo del umbral → 409 con mensaje explicando cuál de las dos condiciones falló.
- `POST /training/jobs/:id/promote` sobre un `ModelVersion` que no está en `LISTO_PARA_PROMOVER`/`REEMPLAZADO` → 400.

### fruit-training
- Imagen inaccesible en R2 durante exportación → se omite esa entrada, el job continúa.
- Cualquier excepción no capturada durante export/entrenamiento/evaluación → se captura en el nivel superior del job en background, se reporta `FAILED` con el mensaje de la excepción vía `POST /internal/training-complete`. Nunca deja el `TrainingJob` sin resolver desde el lado de `fruit-training` (el timeout de la sección 4 cubre el caso en que ni siquiera ese reporte llega, ej. crash del proceso).

### Frontend
- Errores de `POST /training/jobs` y `.../promote` se muestran con `message.error` (Ant Design), consistente con el resto del panel.
- La pantalla nunca queda en un estado ambiguo: si el polling detecta que el job activo desapareció (completó o fue marcado `FAILED` por timeout) sin que el usuario lo viera terminar en vivo, el próximo refresh simplemente refleja el estado final.

---

## 10. Testing

- **`fruit-backend`** (`training.service.spec.ts`, patrón de `analyses.service.spec.ts` de la fase 1): rechazo de `POST /training/jobs` (job activo, bajo umbral) en transacción; comparación `mAP` vs `mAPBase` → `LISTO_PARA_PROMOVER`/`DESCARTADO`; que `promote()` solo actúe sobre estados válidos; auth de los 2 endpoints internos; lógica del contador de análisis nuevos; timeout perezoso de jobs `RUNNING` colgados.
- **`fruit-training`** (pytest, patrón de `test_analysis.py`/`test_r2_client.py` de `fruit-inference`): normalización de bbox a formato YOLO; mapeo `sano=false → enfermo` sin importar etapa; reproducibilidad del split con semilla fija por `jobId`; construcción del payload de éxito/falla del callback; test de sincronización de `CLASS_MAP` contra `fruit-inference` (sección 5). El entrenamiento real de `ultralytics` se mockea — no se corre YOLO de verdad en la suite.
- **`zarza-web`**: sin suite de tests (consistente con el resto del proyecto); verificación manual con dev server.
- **E2E manual**: disparar un job con un dataset chico real (los ~15 análisis revisados que ya existen del E2E de la fase 1 no alcanzan el umbral default de 50 — para la verificación se puede bajar `TRAINING_MIN_REVIEWED_ANALYSES` temporalmente), confirmar que `fruit-training` sube el `.pt` a R2 y reporta, confirmar que "Promover" reemplaza el archivo y `fruit-inference` se reinicia solo y sirve con el modelo nuevo, y confirmar que re-promover una versión `REEMPLAZADO` (rollback) funciona.

---

## 11. Explícitamente Fuera de Alcance

- Entrenamiento con GPU / infraestructura de cómputo dedicada — el diseño es compatible (`ultralytics` detecta CUDA solo), pero no se dimensiona ni se configura en este spec.
- Taxonomía de tipos específicos de enfermedad/plaga — igual que la fase 1, solo `enfermo` genérico.
- Split de validación fijo/estable entre jobs (para comparabilidad estricta de mAP a través del tiempo) — se usa split aleatorio por job + reevaluación del modelo base en el mismo split, que es suficiente para decidir promover o no un job individual, pero no permite graficar "mAP a través del tiempo" de forma rigurosa.
- Paquete Python compartido entre `fruit-inference` y `fruit-training` — se usa duplicación + test de consistencia.
- Entrenamientos programados automáticamente (cron/scheduler) — el disparo es siempre manual, vía botón ADMIN.
- Acceso de `AGRONOMO` a esta pantalla — solo `ADMIN`.
- Notificaciones en tiempo real (WebSocket/push) del progreso de un job — solo polling en la pantalla dedicada.

---

## 12. Archivos a Crear / Modificar

### `packages/database`
- `prisma/schema.prisma` — modelos `TrainingJob`, `ModelVersion`, enums, relaciones inversas en `User`.
- Nueva migración vía `pnpm run migrate:dev --name add_training_pipeline`.

### `fruit-inference`
- `model_config.py` — agregar clase `enfermo` a `CLASS_MAP`.
- `main.py` / nuevo módulo — endpoint `POST /internal/prepare-restart`.
- `infrastructure/auth.py` — reusar validación de `INFERENCE_AUTH_TOKEN` para el endpoint nuevo.

### `fruit-training` (nuevo servicio)
- Estructura análoga a `fruit-inference`: `main.py` (FastAPI + endpoint `POST /train`), `model_config.py` (copia sincronizada), `domain/dataset_export.py`, `domain/training.py`, `infrastructure/r2_client.py`, `infrastructure/backend_client.py` (consume `/internal/training/dataset`, reporta a `/internal/training-complete`), `infrastructure/auth.py`.
- `Dockerfile`, `requirements.txt` (`ultralytics`, `fastapi`, `boto3`, `pillow`, `httpx`).
- `tests/` — cobertura de exportación, mapeo de clases, reproducibilidad de split, payloads de callback.
- Entrada nueva en `docker-compose.yml`.

### `fruit-backend`
- `src/training/` (módulo nuevo) — `training.controller.ts`, `training.service.ts`, `training-internal.controller.ts`.
- `src/training/dto/` — DTOs de request/response.
- Variables de entorno nuevas: `TRAINING_INTERNAL_TOKEN`, `TRAINING_MIN_REVIEWED_ANALYSES`, `TRAINING_JOB_TIMEOUT_HOURS`, `TRAINING_EPOCHS`.

### `docker-compose.yml`
- Agregar servicio `fruit-training`.
- Agregar `restart: unless-stopped` a `fruit-inference`.
- Agregar volumen de escritura en `fruit-backend` hacia `./fruit-inference/best.pt` (ver sección 7).

### `zarza-web`
- `src/modelos-ia/ModelosIAPage.tsx` — nuevo (3 tabs).
- `src/modelos-ia/useTrainingStatus.ts` — nuevo (hooks React Query).
- `src/App.tsx` — ruta `/admin/modelos-ia`.
- `src/shared/AppShell.tsx` — enlace en sidebar.
