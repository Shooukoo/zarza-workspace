# Pipeline de Reentrenamiento del Modelo con Feedback Humano — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exportar el feedback acumulado en `Detection`/`ModelFeedback` (fase 1) a un dataset YOLO, entrenar (`fruit-training`, servicio nuevo), versionar el resultado, y darle a `ADMIN` una pantalla en `zarza-web` para comparar métricas y promover una versión a producción (con rollback).

**Architecture:** Un servicio Python nuevo (`fruit-training`) recibe `POST /train` de `fruit-backend`, exporta el dataset vía `GET /internal/training/dataset`, hace fine-tuning con `ultralytics`, sube el `.pt` a R2 y reporta a `POST /internal/training-complete`. `fruit-backend` gestiona el ciclo de vida (`TrainingJob`/`ModelVersion` en Postgres vía Prisma) y, al promover, descarga el `.pt`, lo escribe en el volumen compartido con `fruit-inference`, y dispara su reinicio controlado (`POST /internal/prepare-restart` + `os._exit(0)` + `restart: unless-stopped`).

**Tech Stack:** NestJS 11 + Prisma (`fruit-backend`), FastAPI + ultralytics + boto3 + httpx (`fruit-training`, nuevo), FastAPI (`fruit-inference`, endpoint nuevo), React + antd + React Query (`zarza-web`).

**Spec de referencia:** `docs/superpowers/specs/2026-08-12-pipeline-reentrenamiento-design.md`

**Decisiones de implementación no explícitas en el spec** (documentadas aquí para que el ingeniero no las re-derive):
1. El payload de `POST /train` (fruit-backend → fruit-training) es `{ job_id, base_model_r2_key }`. El spec menciona un `callbackUrl` en el diagrama de la sección 3, pero el reporte real (sección 4) siempre postea a la ruta fija `/internal/training-complete` usando `BACKEND_URL`, así que `callbackUrl` es redundante y se omite.
2. `fruit-training` no tiene acceso a Postgres, así que no puede saber cuál es el `ModelVersion` `PROMOVIDO` por sí mismo. `fruit-backend` se lo pasa en el body de `POST /train` (`base_model_r2_key`, `null` si es el primer job). `fruit-training` monta el `best.pt` original de solo lectura (igual que `fruit-inference`) como *fallback* cuando `base_model_r2_key` es `null`.
3. El campo `"clase"` que devuelve `GET /internal/training/dataset` (ej. `"naranja"`, `"enfermo"`) no es un campo que ya exista en `Detection`/`ModelFeedback` — se deriva del `{ etapa, sano }` ya resuelto por `resolveDetectionState()` con una función nueva y pequeña (`resolveClaseParaEntrenamiento`), documentada en la Tarea 20.
4. `TrainingJobStatus` pasa de `PENDING` a `RUNNING` en `fruit-backend` inmediatamente después de que la llamada HTTP a `fruit-training POST /train` responde 202 (no hay callback de "job iniciado"). Si la llamada falla, el job se marca `FAILED` de inmediato — nunca queda colgado en `PENDING`.

---

## Prerrequisitos

- Rama `feat/deteccion-feedback-captura` (o una nueva rama sobre `main` una vez mergeada la fase 1) — confirmar con el usuario antes de empezar.
- `docker compose up -d postgres rabbitmq redis` corriendo para las migraciones de Prisma y los tests que las requieran.
- Node 22 + pnpm ≥9, Python 3.11 con un virtualenv en `fruit-inference/.venv` (o crear uno nuevo para `fruit-training`).

---

## Task 1: Modelo de datos (`packages/database`)

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Agregar los enums y modelos nuevos al schema**

Al final de `packages/database/prisma/schema.prisma` (después del modelo `ModelFeedback`, antes de `RefreshToken`), agregar:

```prisma
enum TrainingJobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum ModelVersionStatus {
  ENTRENADO
  LISTO_PARA_PROMOVER
  DESCARTADO
  PROMOVIDO
  REEMPLAZADO
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

- [ ] **Step 2: Agregar las relaciones inversas en `User`**

En el modelo `User`, después de `analysesDeteccionesRevisadas Analysis[] @relation("AnalysisDeteccionesRevisadas")`, agregar:

```prisma
  trainingJobsIniciados   TrainingJob[]
  modelVersionsPromovidas ModelVersion[]
```

- [ ] **Step 3: Generar y aplicar la migración**

Con Postgres corriendo (`docker compose up -d postgres` desde la raíz del monorepo):

```bash
cd packages/database
pnpm run migrate:dev --name add_training_pipeline
```

Expected: el CLI de Prisma crea `packages/database/prisma/migrations/<timestamp>_add_training_pipeline/migration.sql` y la aplica sin errores.

- [ ] **Step 4: Regenerar el cliente Prisma**

```bash
pnpm run generate
```

Expected: sin errores; `packages/database/src/generated/client` incluye los tipos `TrainingJob`, `ModelVersion`, `TrainingJobStatus`, `ModelVersionStatus`.

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add packages/database/prisma
git commit -m "feat(database): agregar modelos TrainingJob y ModelVersion"
```

---

## Task 2: `fruit-inference` — clase `enfermo` en `CLASS_MAP`

**Files:**
- Modify: `fruit-inference/model_config.py`
- Test: `fruit-inference/tests/test_analysis.py`

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `fruit-inference/tests/test_analysis.py`:

```python
def test_clase_enfermo_cuenta_como_enfermo_sin_aportar_peso_sano(bgr_img):
    detections = [
        {"class": "enfermo", "confidence": 0.75, "bbox": (0, 0, 10, 10)},
    ]

    report = build_report(detections, bgr_img, "img-1", None)

    assert report["metricas_salud"]["elementos_enfermos"] == 1
    assert report["metricas_salud"]["elementos_sanos"] == 0
    assert report["proyeccion_financiera"]["peso_sano_gramos"] == 0.0
    assert report["detecciones"] == [
        {
            "clase": "enfermo",
            "etapa": "deteccion_gen",
            "sano": False,
            "confidence": 0.75,
            "bbox": (0, 0, 10, 10),
        }
    ]
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd fruit-inference
pytest tests/test_analysis.py -k test_clase_enfermo -v
```

Expected: FAIL — la detección `enfermo` se descarta porque `CLASS_MAP.get("enfermo")` es `None`, así que `report["detecciones"]` queda vacío.

- [ ] **Step 3: Agregar la clase al `CLASS_MAP`**

En `fruit-inference/model_config.py`, reemplazar el diccionario `CLASS_MAP` completo:

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

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
pytest tests/test_analysis.py -v
```

Expected: PASS (todos los tests del archivo, incluido el nuevo).

- [ ] **Step 5: Commit**

```bash
git add fruit-inference/model_config.py fruit-inference/tests/test_analysis.py
git commit -m "feat(fruit-inference): agregar clase enfermo a CLASS_MAP"
```

---

## Task 3: `fruit-inference` — endpoint `POST /internal/prepare-restart`

**Files:**
- Modify: `fruit-inference/main.py`
- Test: Create `fruit-inference/tests/test_main.py`

- [ ] **Step 1: Escribir el test que falla**

Create `fruit-inference/tests/test_main.py`:

```python
"""
Tests del endpoint interno /internal/prepare-restart. Se importa main.py sin
usar `with TestClient(...)` para NO disparar el lifespan (que cargaría el
modelo YOLO real) — el endpoint no depende de state["model"].
"""

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INFERENCE_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("MODEL_PATH", "model.pt")

    import main as main_module
    importlib.reload(main_module)
    return TestClient(main_module.app), main_module


def test_prepare_restart_rejects_invalid_token(client):
    test_client, _ = client

    response = test_client.post(
        "/internal/prepare-restart", headers={"x-inference-token": "wrong"}
    )

    assert response.status_code == 401


def test_prepare_restart_returns_200_and_schedules_exit(client, monkeypatch):
    test_client, main_module = client
    exit_calls = []
    monkeypatch.setattr(main_module.os, "_exit", lambda code: exit_calls.append(code))

    response = test_client.post(
        "/internal/prepare-restart", headers={"x-inference-token": "test-token"}
    )

    assert response.status_code == 200
    assert exit_calls == [0]
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd fruit-inference
pytest tests/test_main.py -v
```

Expected: FAIL — `404 Not Found`, la ruta `/internal/prepare-restart` no existe todavía.

- [ ] **Step 3: Agregar el endpoint**

En `fruit-inference/main.py`, cambiar el import de FastAPI (línea 25) para incluir `BackgroundTasks`:

```python
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request
```

Agregar el endpoint nuevo al final del archivo, después de `analyze(...)`:

```python
@app.post(
    "/internal/prepare-restart", dependencies=[Depends(verify_inference_token)]
)
def prepare_restart(background_tasks: BackgroundTasks):
    """
    Responde 200 de inmediato y, tras enviar la respuesta, termina el proceso.
    Docker (restart: unless-stopped) relanza el contenedor y el lifespan
    recoge el best.pt reemplazado sin cambios adicionales.
    """
    background_tasks.add_task(os._exit, 0)
    return {"status": "restarting"}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
pytest tests/test_main.py -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Correr toda la suite de `fruit-inference` para verificar que no rompió nada**

```bash
pytest -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add fruit-inference/main.py fruit-inference/tests/test_main.py
git commit -m "feat(fruit-inference): agregar endpoint interno de reinicio controlado"
```

---

## Task 4: `fruit-training` — esqueleto del servicio nuevo

**Files:**
- Create: `fruit-training/requirements.txt`
- Create: `fruit-training/Dockerfile`
- Create: `fruit-training/.env.example`
- Create: `fruit-training/.gitignore`
- Create: `fruit-training/model_config.py`
- Create: `fruit-training/tests/__init__.py`
- Create: `fruit-training/tests/test_class_map_sync.py`
- Create: `fruit-training/domain/__init__.py`
- Create: `fruit-training/infrastructure/__init__.py`

- [ ] **Step 1: Crear la estructura de directorios y archivos vacíos de paquete**

```bash
mkdir -p fruit-training/domain fruit-training/infrastructure fruit-training/tests
touch fruit-training/domain/__init__.py fruit-training/infrastructure/__init__.py fruit-training/tests/__init__.py
```

- [ ] **Step 2: Crear `requirements.txt`**

`fruit-training/requirements.txt`:

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
ultralytics>=8.2.0
boto3>=1.34.0
pillow>=10.3.0
python-dotenv>=1.0.1
pydantic>=2.7.0
httpx>=0.27.0
numpy>=1.26.0
```

- [ ] **Step 3: Crear `Dockerfile`**

`fruit-training/Dockerfile`:

```dockerfile
# ─── Etapa base: Python slim con dependencias del sistema ──────────────────────
FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema necesarias para OpenCV (usado transitivamente por ultralytics)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Instala dependencias Python primero (capa cacheable)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el código fuente
COPY . .

# Puerto por defecto de uvicorn (solo red interna Docker, sin publicar al host)
EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

- [ ] **Step 4: Crear `.gitignore`**

`fruit-training/.gitignore`:

```
__pycache__/
*.pyc
.venv/
.env
.pytest_cache/
```

- [ ] **Step 5: Crear `.env.example`**

`fruit-training/.env.example`:

```
# URL de fruit-backend. En docker-compose se inyecta vía "environment:";
# usar localhost si se corre fuera de Docker.
BACKEND_URL=http://fruit-backend:3000

# Token compartido con fruit-backend: entrante en POST /train, saliente en
# GET /internal/training/dataset y POST /internal/training-complete.
# Debe coincidir con TRAINING_INTERNAL_TOKEN en fruit-backend/.env.
# Generar con: openssl rand -hex 32
TRAINING_INTERNAL_TOKEN=

# Cloudflare R2 — mismas credenciales que fruit-backend/fruit-inference
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=fruit-images

# Ruta al modelo base de respaldo (montado de solo lectura), usado como punto
# de partida del fine-tuning cuando todavía no hay ningún ModelVersion PROMOVIDO
FALLBACK_MODEL_PATH=base-model.pt

# Hiperparámetros de entrenamiento
TRAINING_EPOCHS=50
```

- [ ] **Step 6: Crear la copia sincronizada de `model_config.py`**

`fruit-training/model_config.py`:

```python
"""
fruit-training — Copia sincronizada del mapeo de clases de fruit-inference.

IMPORTANTE: debe coincidir EXACTAMENTE (claves y orden) con
fruit-inference/model_config.py. tests/test_class_map_sync.py falla si se
desincronizan. No se introduce un paquete Python compartido nuevo — duplicar
con un test de consistencia es suficiente para el volumen de cambio esperado
en este mapeo.
"""

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

CLASS_NAMES: list[str] = list(CLASS_MAP.keys())
```

- [ ] **Step 7: Escribir el test de sincronización**

`fruit-training/tests/test_class_map_sync.py`:

```python
"""
Verifica que fruit-training/model_config.py y fruit-inference/model_config.py
tengan exactamente las mismas clases, en el mismo orden. Si se desincronizan,
las predicciones de fruit-inference se interpretarían con el mapeo equivocado
al entrenar.
"""

import importlib.util
import sys
from pathlib import Path


def _load_fruit_inference_class_map() -> dict:
    fruit_inference_path = (
        Path(__file__).resolve().parents[2] / "fruit-inference" / "model_config.py"
    )
    spec = importlib.util.spec_from_file_location(
        "fruit_inference_model_config", fruit_inference_path
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.CLASS_MAP


def test_class_map_matches_fruit_inference_exactly():
    from model_config import CLASS_MAP as training_class_map

    inference_class_map = _load_fruit_inference_class_map()

    assert list(training_class_map.keys()) == list(inference_class_map.keys())
    assert training_class_map == inference_class_map
```

- [ ] **Step 2 (retomado): Correr el test de sincronización**

```bash
cd fruit-training
pytest tests/test_class_map_sync.py -v
```

Expected: PASS (los diccionarios son idénticos porque se copiaron literalmente en el Step 6).

- [ ] **Step 8: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-training
git commit -m "feat(fruit-training): esqueleto del servicio de entrenamiento"
```

---

## Task 5: `fruit-training` — autenticación por token compartido

**Files:**
- Create: `fruit-training/infrastructure/auth.py`
- Test: Create `fruit-training/tests/test_auth.py`

- [ ] **Step 1: Escribir el test que falla**

`fruit-training/tests/test_auth.py`:

```python
import importlib

import pytest
from fastapi import HTTPException


def _reload_auth_module():
    from infrastructure import auth as auth_module
    importlib.reload(auth_module)
    return auth_module


def test_raises_at_import_if_token_missing(monkeypatch):
    monkeypatch.delenv("TRAINING_INTERNAL_TOKEN", raising=False)

    with pytest.raises(RuntimeError):
        _reload_auth_module()


def test_rejects_wrong_token(monkeypatch):
    monkeypatch.setenv("TRAINING_INTERNAL_TOKEN", "correct-token")
    auth_module = _reload_auth_module()

    with pytest.raises(HTTPException) as exc_info:
        auth_module.verify_training_token(x_training_token="wrong-token")
    assert exc_info.value.status_code == 401


def test_accepts_correct_token(monkeypatch):
    monkeypatch.setenv("TRAINING_INTERNAL_TOKEN", "correct-token")
    auth_module = _reload_auth_module()

    assert auth_module.verify_training_token(x_training_token="correct-token") is None
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd fruit-training
pytest tests/test_auth.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'infrastructure.auth'`.

- [ ] **Step 3: Implementar `infrastructure/auth.py`**

`fruit-training/infrastructure/auth.py`:

```python
"""
fruit-training — Infraestructura: autenticación por token compartido.

Responsabilidad: validar que las llamadas a /train incluyan el header
x-training-token con el valor esperado (TRAINING_INTERNAL_TOKEN). El mismo
token se usa en sentido inverso cuando fruit-training llama a los endpoints
internos de fruit-backend (ver infrastructure/backend_client.py).
"""

import os
import secrets

from fastapi import Header, HTTPException

TRAINING_INTERNAL_TOKEN = os.getenv("TRAINING_INTERNAL_TOKEN", "")

if not TRAINING_INTERNAL_TOKEN:
    raise RuntimeError("TRAINING_INTERNAL_TOKEN env var is required")


def verify_training_token(x_training_token: str = Header(...)) -> None:
    """Lanza 401 si el header x-training-token no coincide con el esperado."""
    if not secrets.compare_digest(x_training_token, TRAINING_INTERNAL_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid training token")
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
pytest tests/test_auth.py -v
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-training/infrastructure/auth.py fruit-training/tests/test_auth.py
git commit -m "feat(fruit-training): autenticación por token compartido"
```

---

## Task 6: `fruit-training` — cliente R2 (descarga del modelo base, subida del modelo entrenado)

**Files:**
- Create: `fruit-training/infrastructure/r2_client.py`
- Test: Create `fruit-training/tests/test_r2_client.py`

- [ ] **Step 1: Escribir los tests que fallan**

`fruit-training/tests/test_r2_client.py`:

```python
from pathlib import Path
from unittest.mock import MagicMock

from infrastructure.r2_client import download_model_file, upload_model_file


def test_download_model_file_calls_s3_download_file():
    s3 = MagicMock()
    dest = Path("/tmp/base_model.pt")

    download_model_file(s3, "bucket", "models/best_v1.pt", dest)

    s3.download_file.assert_called_once_with("bucket", "models/best_v1.pt", str(dest))


def test_upload_model_file_returns_key_with_job_id_and_calls_s3_upload_file():
    s3 = MagicMock()
    local_path = Path("/tmp/best_job-123.pt")

    key = upload_model_file(s3, "bucket", local_path, "job-123")

    assert key == "models/best_job-123.pt"
    s3.upload_file.assert_called_once_with(str(local_path), "bucket", "models/best_job-123.pt")
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-training
pytest tests/test_r2_client.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'infrastructure.r2_client'`.

- [ ] **Step 3: Implementar `infrastructure/r2_client.py`**

`fruit-training/infrastructure/r2_client.py`:

```python
"""
fruit-training — Infraestructura: cliente de Cloudflare R2 (boto3/S3).

Responsabilidad: descargar el modelo base a reentrenar y subir el modelo
resultante del fine-tuning. Aísla toda la configuración de boto3 del resto
de la aplicación.
"""

import os
from pathlib import Path

import boto3
from botocore.config import Config


def create_r2_client():
    """Crea y retorna un cliente boto3 configurado para Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT", ""),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID", ""),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY", ""),
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def download_model_file(s3_client, bucket: str, r2_key: str, dest_path: Path) -> None:
    """Descarga un .pt de R2 a una ruta local, para usarlo como modelo base del fine-tuning."""
    s3_client.download_file(bucket, r2_key, str(dest_path))


def upload_model_file(s3_client, bucket: str, local_path: Path, job_id: str) -> str:
    """Sube el .pt entrenado a R2 bajo el prefijo models/ y retorna su key."""
    r2_key = f"models/best_{job_id}.pt"
    s3_client.upload_file(str(local_path), bucket, r2_key)
    return r2_key
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pytest tests/test_r2_client.py -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-training/infrastructure/r2_client.py fruit-training/tests/test_r2_client.py
git commit -m "feat(fruit-training): cliente R2 para descarga/subida de modelos"
```

---

## Task 7: `fruit-training` — cliente HTTP hacia `fruit-backend`

**Files:**
- Create: `fruit-training/infrastructure/backend_client.py`
- Test: Create `fruit-training/tests/test_backend_client.py`

- [ ] **Step 1: Escribir los tests que fallan**

`fruit-training/tests/test_backend_client.py`:

```python
import httpx
import pytest


class DummyResponse:
    def __init__(self, json_data=None, status_code=200):
        self._json = json_data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=self)

    def json(self):
        return self._json


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("BACKEND_URL", "http://fruit-backend:3000")
    monkeypatch.setenv("TRAINING_INTERNAL_TOKEN", "shared-token")
    import importlib
    from infrastructure import backend_client as backend_client_module
    importlib.reload(backend_client_module)
    return backend_client_module


def test_fetch_dataset_calls_expected_url_and_headers(monkeypatch, set_env):
    backend_client = set_env
    captured = {}

    def fake_get(url, headers=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        return DummyResponse(json_data=[{"imageUrl": "https://x", "detecciones": []}])

    monkeypatch.setattr(backend_client.httpx, "get", fake_get)

    result = backend_client.fetch_dataset()

    assert captured["url"] == "http://fruit-backend:3000/api/v1/internal/training/dataset"
    assert captured["headers"] == {"x-training-token": "shared-token"}
    assert result == [{"imageUrl": "https://x", "detecciones": []}]


def test_report_success_posts_completed_payload(monkeypatch, set_env):
    backend_client = set_env
    captured = {}

    def fake_post(url, json=None, headers=None, timeout=None):
        captured["url"] = url
        captured["json"] = json
        return DummyResponse()

    monkeypatch.setattr(backend_client.httpx, "post", fake_post)

    backend_client.report_success("job-1", 0.75, 0.60, "models/best_job-1.pt", 42)

    assert captured["url"] == "http://fruit-backend:3000/api/v1/internal/training-complete"
    assert captured["json"] == {
        "jobId": "job-1",
        "status": "COMPLETED",
        "mAP": 0.75,
        "mAPBase": 0.60,
        "r2Key": "models/best_job-1.pt",
        "datasetSize": 42,
    }


def test_report_failure_posts_failed_payload(monkeypatch, set_env):
    backend_client = set_env
    captured = {}

    def fake_post(url, json=None, headers=None, timeout=None):
        captured["json"] = json
        return DummyResponse()

    monkeypatch.setattr(backend_client.httpx, "post", fake_post)

    backend_client.report_failure("job-2", "R2 inaccesible")

    assert captured["json"] == {
        "jobId": "job-2",
        "status": "FAILED",
        "errorMessage": "R2 inaccesible",
    }
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-training
pytest tests/test_backend_client.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'infrastructure.backend_client'`.

- [ ] **Step 3: Implementar `infrastructure/backend_client.py`**

`fruit-training/infrastructure/backend_client.py`:

```python
"""
fruit-training — Infraestructura: cliente HTTP hacia fruit-backend.

Responsabilidad: obtener el dataset de entrenamiento y reportar el resultado
del job. Aísla toda la configuración de httpx del resto de la aplicación.
"""

import os

import httpx

BACKEND_URL = os.getenv("BACKEND_URL", "http://fruit-backend:3000")
TRAINING_INTERNAL_TOKEN = os.getenv("TRAINING_INTERNAL_TOKEN", "")


def fetch_dataset() -> list[dict]:
    """Obtiene, por análisis revisado, la URL de imagen + detecciones ya resueltas."""
    response = httpx.get(
        f"{BACKEND_URL}/api/v1/internal/training/dataset",
        headers={"x-training-token": TRAINING_INTERNAL_TOKEN},
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def report_success(
    job_id: str, m_ap: float, m_ap_base: float, r2_key: str, dataset_size: int
) -> None:
    """Reporta que el job terminó exitosamente, con las métricas y el .pt subido a R2."""
    _report(
        {
            "jobId": job_id,
            "status": "COMPLETED",
            "mAP": m_ap,
            "mAPBase": m_ap_base,
            "r2Key": r2_key,
            "datasetSize": dataset_size,
        }
    )


def report_failure(job_id: str, error_message: str) -> None:
    """Reporta que el job falló, con el mensaje de la excepción."""
    _report({"jobId": job_id, "status": "FAILED", "errorMessage": error_message})


def _report(payload: dict) -> None:
    response = httpx.post(
        f"{BACKEND_URL}/api/v1/internal/training-complete",
        json=payload,
        headers={"x-training-token": TRAINING_INTERNAL_TOKEN},
        timeout=30.0,
    )
    response.raise_for_status()
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pytest tests/test_backend_client.py -v
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-training/infrastructure/backend_client.py fruit-training/tests/test_backend_client.py
git commit -m "feat(fruit-training): cliente HTTP hacia fruit-backend"
```

---

## Task 8: `fruit-training` — normalización de bbox y mapeo de clases (dominio)

**Files:**
- Create: `fruit-training/domain/dataset_export.py`
- Test: Create `fruit-training/tests/test_dataset_export.py`

- [ ] **Step 1: Escribir los tests que fallan**

`fruit-training/tests/test_dataset_export.py`:

```python
from domain.dataset_export import bbox_to_yolo, resolve_class_id, split_dataset


def test_bbox_to_yolo_normaliza_a_0_1():
    x_center, y_center, width, height = bbox_to_yolo((10, 20, 30, 60), img_width=100, img_height=200)

    assert x_center == 0.2
    assert y_center == 0.2
    assert width == 0.2
    assert height == 0.2


def test_resolve_class_id_usa_el_orden_de_class_names():
    assert resolve_class_id("boton") == 0
    assert resolve_class_id("enfermo") == 7


def test_split_dataset_es_reproducible_dentro_del_mismo_job():
    entries = [{"id": i} for i in range(10)]

    train_a, val_a = split_dataset(entries, "job-1")
    train_b, val_b = split_dataset(entries, "job-1")

    assert train_a == train_b
    assert val_a == val_b
    assert len(train_a) == 8
    assert len(val_a) == 2


def test_split_dataset_difiere_entre_jobs_distintos():
    entries = [{"id": i} for i in range(10)]

    train_job1, _ = split_dataset(entries, "job-1")
    train_job2, _ = split_dataset(entries, "job-2")

    assert train_job1 != train_job2
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-training
pytest tests/test_dataset_export.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'domain.dataset_export'`.

- [ ] **Step 3: Implementar las funciones puras en `domain/dataset_export.py`**

`fruit-training/domain/dataset_export.py`:

```python
"""
fruit-training — Capa de dominio: exportación del dataset de entrenamiento.

Responsabilidad: transformar el dataset resuelto de fruit-backend (imagen +
detecciones ya corregidas) en la estructura de carpetas que espera
ultralytics (images/, labels/, data.yaml), con normalización de bbox a
formato YOLO y split train/val reproducible por job.
"""

import hashlib
import random

from model_config import CLASS_NAMES


def bbox_to_yolo(
    bbox: tuple[float, float, float, float],
    img_width: int,
    img_height: int,
) -> tuple[float, float, float, float]:
    """Normaliza un bbox [x1, y1, x2, y2] en píxeles a formato YOLO (x_center, y_center, width, height), 0-1."""
    x1, y1, x2, y2 = bbox
    width = (x2 - x1) / img_width
    height = (y2 - y1) / img_height
    x_center = (x1 + x2) / 2 / img_width
    y_center = (y1 + y2) / 2 / img_height
    return (x_center, y_center, width, height)


def resolve_class_id(clase: str) -> int:
    """Mapea un nombre de clase a su class_id según el orden de CLASS_NAMES."""
    return CLASS_NAMES.index(clase)


def split_dataset(
    entries: list[dict], job_id: str, train_ratio: float = 0.8
) -> tuple[list[dict], list[dict]]:
    """
    Split 80/20 train/val, reproducible dentro del mismo job (semilla = hash
    de job_id) y distinto entre jobs.
    """
    seed = int(hashlib.sha256(job_id.encode()).hexdigest(), 16) % (2**32)
    shuffled = entries.copy()
    random.Random(seed).shuffle(shuffled)
    split_index = round(len(shuffled) * train_ratio)
    return shuffled[:split_index], shuffled[split_index:]
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pytest tests/test_dataset_export.py -v
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-training/domain/dataset_export.py fruit-training/tests/test_dataset_export.py
git commit -m "feat(fruit-training): normalización de bbox y split reproducible"
```

---

## Task 9: `fruit-training` — orquestación de exportación (descarga + escritura de carpetas)

**Files:**
- Modify: `fruit-training/domain/dataset_export.py`
- Test: Modify `fruit-training/tests/test_dataset_export.py`

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `fruit-training/tests/test_dataset_export.py`:

```python
import io

from PIL import Image

from domain.dataset_export import export_dataset


def _fake_jpeg_bytes(width=100, height=100) -> bytes:
    image = Image.new("RGB", (width, height), color="red")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


class DummyImageResponse:
    def __init__(self, content: bytes, status_code: int = 200):
        self.content = content
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


def test_export_dataset_escribe_estructura_ultralytics(tmp_path, monkeypatch):
    image_bytes = _fake_jpeg_bytes()

    def fake_get(url, timeout=None):
        return DummyImageResponse(image_bytes)

    monkeypatch.setattr("domain.dataset_export.httpx.get", fake_get)

    entries = [
        {
            "imageUrl": f"https://x/{i}.jpg",
            "detecciones": [{"clase": "naranja", "sano": True, "bbox": [10, 10, 50, 50]}],
        }
        for i in range(10)
    ]

    dataset_size = export_dataset(entries, "job-1", tmp_path)

    assert dataset_size == 10
    assert (tmp_path / "data.yaml").exists()
    train_images = list((tmp_path / "images" / "train").glob("*.jpg"))
    val_images = list((tmp_path / "images" / "val").glob("*.jpg"))
    assert len(train_images) == 8
    assert len(val_images) == 2
    train_labels = list((tmp_path / "labels" / "train").glob("*.txt"))
    assert len(train_labels) == 8
    label_content = train_labels[0].read_text()
    assert label_content.startswith("3 ")  # class_id de "naranja"


def test_export_dataset_omite_imagenes_inaccesibles(tmp_path, monkeypatch):
    def fake_get(url, timeout=None):
        raise Exception("connection refused")

    monkeypatch.setattr("domain.dataset_export.httpx.get", fake_get)

    entries = [
        {"imageUrl": "https://x/1.jpg", "detecciones": [{"clase": "naranja", "sano": True, "bbox": [1, 1, 2, 2]}]}
    ]

    dataset_size = export_dataset(entries, "job-1", tmp_path)

    assert dataset_size == 0
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-training
pytest tests/test_dataset_export.py -k export_dataset -v
```

Expected: FAIL — `AttributeError` / `ImportError`, `export_dataset` no existe todavía.

- [ ] **Step 3: Implementar `export_dataset` en `domain/dataset_export.py`**

Agregar al final de `fruit-training/domain/dataset_export.py` (después de `split_dataset`, ajustando los imports del encabezado):

```python
import io
import logging
from pathlib import Path

import httpx
from PIL import Image

logger = logging.getLogger("fruit-training")
```

```python
def export_dataset(entries: list[dict], job_id: str, output_dir: Path) -> int:
    """
    Descarga las imágenes, normaliza las detecciones a formato YOLO y escribe
    la estructura de carpetas que espera ultralytics bajo output_dir.

    Si una imagen es inaccesible, esa entrada se omite con un log de
    advertencia — no aborta el job completo.

    Returns:
        Cantidad de imágenes efectivamente incluidas en el dataset.
    """
    downloaded: list[dict] = []
    for entry in entries:
        try:
            response = httpx.get(entry["imageUrl"], timeout=30.0)
            response.raise_for_status()
            image = Image.open(io.BytesIO(response.content))
            width, height = image.size
        except Exception as exc:
            logger.warning("Imagen inaccesible, se omite del dataset: %s", exc)
            continue
        downloaded.append(
            {**entry, "image_bytes": response.content, "width": width, "height": height}
        )

    train_entries, val_entries = split_dataset(downloaded, job_id)

    for split_name, split_entries in (("train", train_entries), ("val", val_entries)):
        images_dir = output_dir / "images" / split_name
        labels_dir = output_dir / "labels" / split_name
        images_dir.mkdir(parents=True, exist_ok=True)
        labels_dir.mkdir(parents=True, exist_ok=True)

        for i, entry in enumerate(split_entries):
            filename = f"{split_name}_{i}"
            (images_dir / f"{filename}.jpg").write_bytes(entry["image_bytes"])

            lines = []
            for det in entry["detecciones"]:
                class_id = resolve_class_id(det["clase"])
                x_center, y_center, width, height = bbox_to_yolo(
                    tuple(det["bbox"]), entry["width"], entry["height"]
                )
                lines.append(
                    f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"
                )
            (labels_dir / f"{filename}.txt").write_text("\n".join(lines))

    data_yaml = output_dir / "data.yaml"
    names_block = "\n".join(f"  {i}: {name}" for i, name in enumerate(CLASS_NAMES))
    data_yaml.write_text(
        f"path: {output_dir}\ntrain: images/train\nval: images/val\nnames:\n{names_block}\n"
    )

    return len(downloaded)
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pytest tests/test_dataset_export.py -v
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-training/domain/dataset_export.py fruit-training/tests/test_dataset_export.py
git commit -m "feat(fruit-training): orquestación de exportación del dataset"
```

---

## Task 10: `fruit-training` — fine-tuning y evaluación (dominio)

**Files:**
- Create: `fruit-training/domain/training.py`
- Test: Create `fruit-training/tests/test_training.py`

- [ ] **Step 1: Escribir los tests que fallan**

`fruit-training/tests/test_training.py`:

```python
from pathlib import Path


class FakeMetrics:
    class Box:
        map50 = 0.812

    box = Box()


class FakeYOLO:
    instances: list["FakeYOLO"] = []

    def __init__(self, model_path):
        self.model_path = model_path
        self.train_calls = []
        self.val_calls = []
        FakeYOLO.instances.append(self)

    def train(self, **kwargs):
        self.train_calls.append(kwargs)

    def val(self, **kwargs):
        self.val_calls.append(kwargs)
        return FakeMetrics()


def test_run_training_construye_yolo_con_el_modelo_base_y_llama_train(monkeypatch):
    FakeYOLO.instances.clear()
    monkeypatch.setattr("domain.training.YOLO", FakeYOLO)

    from domain.training import run_training

    model = run_training("base.pt", Path("data.yaml"), epochs=25)

    assert model.model_path == "base.pt"
    assert model.train_calls == [
        {"data": "data.yaml", "epochs": 25, "imgsz": 640, "patience": 10}
    ]


def test_evaluate_retorna_map50_como_float(monkeypatch):
    monkeypatch.setattr("domain.training.YOLO", FakeYOLO)

    from domain.training import evaluate

    model = FakeYOLO("base.pt")
    m_ap = evaluate(model, Path("data.yaml"))

    assert m_ap == 0.812
    assert isinstance(m_ap, float)
    assert model.val_calls == [{"data": "data.yaml"}]
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-training
pytest tests/test_training.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'domain.training'`.

- [ ] **Step 3: Implementar `domain/training.py`**

`fruit-training/domain/training.py`:

```python
"""
fruit-training — Capa de dominio: fine-tuning y evaluación del modelo.

Responsabilidad: envolver las llamadas a ultralytics para entrenar y medir
mAP@0.5. Sin dependencias de FastAPI ni de infraestructura (R2, HTTP).
"""

from pathlib import Path

from ultralytics import YOLO


def run_training(base_model_path: str, dataset_yaml: Path, epochs: int):
    """Corre fine-tuning sobre el modelo base y retorna el modelo resultante."""
    model = YOLO(base_model_path)
    model.train(data=str(dataset_yaml), epochs=epochs, imgsz=640, patience=10)
    return model


def evaluate(model, dataset_yaml: Path) -> float:
    """Evalúa un modelo (YOLO) contra el split de validación y retorna mAP@0.5."""
    metrics = model.val(data=str(dataset_yaml))
    return float(metrics.box.map50)
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pytest tests/test_training.py -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-training/domain/training.py fruit-training/tests/test_training.py
git commit -m "feat(fruit-training): fine-tuning y evaluación mAP@0.5"
```

---

## Task 11: `fruit-training` — orquestación FastAPI (`main.py`)

**Files:**
- Create: `fruit-training/main.py`
- Test: Create `fruit-training/tests/test_main.py`

- [ ] **Step 1: Escribir los tests que fallan**

`fruit-training/tests/test_main.py`:

```python
"""
Tests de orquestación de main.py. Se monkeypatchean todas las dependencias
externas de run_training_job (red, R2, ultralytics) para verificar sólo el
flujo de control y el contrato con backend_client.
"""

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def app_module(monkeypatch):
    monkeypatch.setenv("TRAINING_INTERNAL_TOKEN", "test-token")
    monkeypatch.setenv("BACKEND_URL", "http://fruit-backend:3000")
    monkeypatch.setenv("R2_BUCKET_NAME", "bucket")
    monkeypatch.setenv("FALLBACK_MODEL_PATH", "base-model.pt")
    monkeypatch.setenv("TRAINING_EPOCHS", "5")

    import main as main_module
    importlib.reload(main_module)
    return main_module


def test_train_endpoint_rejects_invalid_token(app_module):
    client = TestClient(app_module.app)

    response = client.post(
        "/train",
        json={"job_id": "job-1", "base_model_r2_key": None},
        headers={"x-training-token": "wrong"},
    )

    assert response.status_code == 401


def test_train_endpoint_returns_202_and_schedules_background_job(app_module, monkeypatch):
    calls = []
    monkeypatch.setattr(
        app_module, "run_training_job", lambda job_id, base_model_r2_key: calls.append((job_id, base_model_r2_key))
    )
    client = TestClient(app_module.app)

    response = client.post(
        "/train",
        json={"job_id": "job-1", "base_model_r2_key": "models/best_v3.pt"},
        headers={"x-training-token": "test-token"},
    )

    assert response.status_code == 202
    assert calls == [("job-1", "models/best_v3.pt")]


def test_run_training_job_happy_path_reports_success(app_module, monkeypatch):
    monkeypatch.setattr(app_module, "fetch_dataset", lambda: [{"imageUrl": "x", "detecciones": []}])
    monkeypatch.setattr(app_module, "export_dataset", lambda entries, job_id, out_dir: 7)
    monkeypatch.setattr(app_module, "_resolve_base_model_path", lambda key, tmp: "base.pt")

    fake_trained_model = type("M", (), {"save": lambda self, path: None})()
    monkeypatch.setattr(app_module, "run_training", lambda base, yaml, epochs: fake_trained_model)
    monkeypatch.setattr(app_module, "evaluate", lambda model, yaml: 0.9)
    monkeypatch.setattr(app_module, "create_r2_client", lambda: object())
    monkeypatch.setattr(app_module, "upload_model_file", lambda s3, bucket, path, job_id: "models/best_job-1.pt")

    reported = {}
    monkeypatch.setattr(
        app_module,
        "report_success",
        lambda job_id, m_ap, m_ap_base, r2_key, dataset_size: reported.update(
            job_id=job_id, m_ap=m_ap, m_ap_base=m_ap_base, r2_key=r2_key, dataset_size=dataset_size
        ),
    )

    app_module.run_training_job("job-1", None)

    assert reported == {
        "job_id": "job-1",
        "m_ap": 0.9,
        "m_ap_base": 0.9,
        "r2_key": "models/best_job-1.pt",
        "dataset_size": 7,
    }


def test_run_training_job_reports_failure_on_exception(app_module, monkeypatch):
    def raise_error():
        raise RuntimeError("R2 inaccesible")

    monkeypatch.setattr(app_module, "fetch_dataset", raise_error)

    reported = {}
    monkeypatch.setattr(
        app_module, "report_failure", lambda job_id, error_message: reported.update(job_id=job_id, error_message=error_message)
    )

    app_module.run_training_job("job-2", None)

    assert reported["job_id"] == "job-2"
    assert "R2 inaccesible" in reported["error_message"]


def test_health_endpoint(app_module):
    client = TestClient(app_module.app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-training
pytest tests/test_main.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'main'`.

- [ ] **Step 3: Implementar `main.py`**

`fruit-training/main.py`:

```python
"""
fruit-training — Entry point: app FastAPI + orquestación del job de entrenamiento.

Toda la lógica de negocio reside en:
  domain/dataset_export.py  → normalización de bbox + split + escritura del dataset
  domain/training.py        → fine-tuning y evaluación (ultralytics)
  infrastructure/r2_client.py       → descarga/subida de .pt en R2
  infrastructure/backend_client.py  → obtiene el dataset y reporta el resultado

Este archivo sólo orquesta; no contiene lógica de dominio ni de infraestructura.
"""

import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Cargar .env ANTES de importar infrastructure.auth, que valida
# TRAINING_INTERNAL_TOKEN a nivel de módulo (fail-fast).
load_dotenv()

from fastapi import BackgroundTasks, Depends, FastAPI
from pydantic import BaseModel
from ultralytics import YOLO

from infrastructure.auth import verify_training_token
from infrastructure.backend_client import fetch_dataset, report_failure, report_success
from infrastructure.r2_client import create_r2_client, download_model_file, upload_model_file
from domain.dataset_export import export_dataset
from domain.training import evaluate, run_training

R2_BUCKET = os.getenv("R2_BUCKET_NAME", "")
FALLBACK_MODEL_PATH = os.getenv("FALLBACK_MODEL_PATH", "base-model.pt")
TRAINING_EPOCHS = int(os.getenv("TRAINING_EPOCHS", "50"))

logger = logging.getLogger("fruit-training")

app = FastAPI(title="fruit-training")


class TrainRequest(BaseModel):
    job_id: str
    base_model_r2_key: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/train", status_code=202, dependencies=[Depends(verify_training_token)])
def train(req: TrainRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_training_job, req.job_id, req.base_model_r2_key)
    return {"status": "accepted"}


def run_training_job(job_id: str, base_model_r2_key: Optional[str]) -> None:
    try:
        entries = fetch_dataset()
        with tempfile.TemporaryDirectory() as tmp:
            dataset_dir = Path(tmp)
            dataset_size = export_dataset(entries, job_id, dataset_dir)
            dataset_yaml = dataset_dir / "data.yaml"

            base_model_path = _resolve_base_model_path(base_model_r2_key, dataset_dir)

            trained_model = run_training(base_model_path, dataset_yaml, TRAINING_EPOCHS)
            m_ap = evaluate(trained_model, dataset_yaml)

            base_model = YOLO(base_model_path)
            m_ap_base = evaluate(base_model, dataset_yaml)

            trained_pt_path = dataset_dir / f"best_{job_id}.pt"
            trained_model.save(str(trained_pt_path))

            s3 = create_r2_client()
            r2_key = upload_model_file(s3, R2_BUCKET, trained_pt_path, job_id)

            report_success(job_id, m_ap, m_ap_base, r2_key, dataset_size)
    except Exception as exc:
        logger.exception("Job de entrenamiento falló (jobId=%s)", job_id)
        report_failure(job_id, str(exc))


def _resolve_base_model_path(base_model_r2_key: Optional[str], tmp_dir: Path) -> str:
    if base_model_r2_key is None:
        return FALLBACK_MODEL_PATH

    local_path = tmp_dir / "base_model.pt"
    s3 = create_r2_client()
    download_model_file(s3, R2_BUCKET, base_model_r2_key, local_path)
    return str(local_path)
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pytest tests/test_main.py -v
```

Expected: PASS (5 tests).

- [ ] **Step 5: Correr toda la suite de `fruit-training`**

```bash
pytest -v
```

Expected: PASS (todos los tests de todas las tareas anteriores).

- [ ] **Step 6: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-training/main.py fruit-training/tests/test_main.py
git commit -m "feat(fruit-training): orquestación FastAPI del job de entrenamiento"
```

---

## Task 12: `fruit-backend` — extraer `resolveDetectionState` a util compartido

**Por qué:** la Tarea 20 (`getDataset`) necesita la misma lógica de resolución de detecciones que ya usa `AnalysesService.listDetections()`. Se extrae a un módulo compartido en vez de duplicarla.

**Files:**
- Create: `fruit-backend/src/analyses/detection-state.util.ts`
- Create: `fruit-backend/src/analyses/detection-state.util.spec.ts`
- Modify: `fruit-backend/src/analyses/analyses.service.ts`

- [ ] **Step 1: Escribir el test que falla**

`fruit-backend/src/analyses/detection-state.util.spec.ts`:

```typescript
import { resolveDetectionState } from './detection-state.util';

describe('resolveDetectionState', () => {
  it('usa el valor original cuando la detección no tiene feedback', () => {
    const result = resolveDetectionState({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapaDetectada: 'naranja',
      saludDetectada: 'SANO',
      bboxX1: 1,
      bboxY1: 2,
      bboxX2: 3,
      bboxY2: 4,
      feedback: [],
    } as any);

    expect(result).toEqual({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapa: 'naranja',
      sano: true,
      bbox: [1, 2, 3, 4],
      eliminada: false,
    });
  });

  it('usa el feedback más reciente cuando existe', () => {
    const result = resolveDetectionState({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapaDetectada: 'naranja',
      saludDetectada: 'SANO',
      bboxX1: 1,
      bboxY1: 2,
      bboxX2: 3,
      bboxY2: 4,
      feedback: [
        {
          accion: 'EDITAR',
          etapaCorregida: 'maduro',
          saludCorregida: 'ENFERMO',
          bboxX1: null,
          bboxY1: null,
          bboxX2: null,
          bboxY2: null,
        },
      ],
    } as any);

    expect(result).toEqual(
      expect.objectContaining({ etapa: 'maduro', sano: false, bbox: [1, 2, 3, 4] }),
    );
  });

  it('marca eliminada=true cuando el último feedback es ELIMINAR', () => {
    const result = resolveDetectionState({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapaDetectada: 'naranja',
      saludDetectada: 'SANO',
      bboxX1: 1,
      bboxY1: 2,
      bboxX2: 3,
      bboxY2: 4,
      feedback: [
        {
          accion: 'ELIMINAR',
          etapaCorregida: null,
          saludCorregida: null,
          bboxX1: null,
          bboxY1: null,
          bboxX2: null,
          bboxY2: null,
        },
      ],
    } as any);

    expect(result.eliminada).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd fruit-backend
pnpm exec jest detection-state.util.spec.ts
```

Expected: FAIL — `Cannot find module './detection-state.util'`.

- [ ] **Step 3: Crear `detection-state.util.ts` moviendo la lógica desde `analyses.service.ts`**

`fruit-backend/src/analyses/detection-state.util.ts`:

```typescript
import { Prisma } from '@rubus/database';

export interface ResolvedDetectionState {
  id: string;
  origen: string;
  confidence: number | null;
  etapa: string;
  sano: boolean;
  bbox: [number, number, number, number];
  eliminada: boolean;
}

export function resolveDetectionState(
  detection: Prisma.DetectionGetPayload<{ include: { feedback: true } }>,
): ResolvedDetectionState {
  const latest = detection.feedback[0];
  return {
    id: detection.id,
    origen: detection.origen,
    confidence: detection.confidence,
    etapa: latest?.etapaCorregida ?? detection.etapaDetectada,
    sano: (latest?.saludCorregida ?? detection.saludDetectada) === 'SANO',
    bbox:
      latest?.bboxX1 != null
        ? [latest.bboxX1, latest.bboxY1!, latest.bboxX2!, latest.bboxY2!]
        : [detection.bboxX1, detection.bboxY1, detection.bboxX2, detection.bboxY2],
    eliminada: latest?.accion === 'ELIMINAR',
  };
}
```

- [ ] **Step 4: Actualizar `analyses.service.ts` para usar el util**

En `fruit-backend/src/analyses/analyses.service.ts`, agregar el import:

```typescript
import { resolveDetectionState } from './detection-state.util';
```

Eliminar el método privado `resolveDetectionState` (líneas 276-297 del archivo original) y reemplazar sus dos usos:

```typescript
return detections.map((detection) => this.resolveDetectionState(detection));
```

por:

```typescript
return detections.map((detection) => resolveDetectionState(detection));
```

y:

```typescript
const recienCreada = { ...detection, feedback: [] };
return this.resolveDetectionState(recienCreada);
```

por:

```typescript
const recienCreada = { ...detection, feedback: [] };
return resolveDetectionState(recienCreada);
```

- [ ] **Step 5: Correr el test nuevo y la suite completa de `analyses`**

```bash
pnpm exec jest detection-state.util.spec.ts analyses.service.spec.ts
```

Expected: PASS (todos — el refactor no cambia comportamiento).

- [ ] **Step 6: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/analyses
git commit -m "refactor(fruit-backend): extraer resolveDetectionState a util compartido"
```

---

## Task 13: `fruit-backend` — variables de entorno y dependencia `@nestjs/axios`

**Files:**
- Modify: `fruit-backend/package.json` (vía `pnpm add`)
- Modify: `fruit-backend/src/config/envs.ts`
- Modify: `fruit-backend/.env.example`
- Modify: `SECURITY.md`

- [ ] **Step 1: Instalar `@nestjs/axios` y `axios`**

```bash
cd /home/san/Proyectos/zarza-workspace
pnpm --filter fruit-backend add @nestjs/axios axios
```

Expected: `fruit-backend/package.json` gana `@nestjs/axios` y `axios` en `dependencies`.

- [ ] **Step 2: Agregar las variables nuevas a `envs.ts`**

En `fruit-backend/src/config/envs.ts`, agregar a la interfaz `EnvVars`:

```typescript
  TRAINING_INTERNAL_TOKEN: string;
  TRAINING_MIN_REVIEWED_ANALYSES: number;
  TRAINING_JOB_TIMEOUT_HOURS: number;
  TRAINING_URL: string;
  INFERENCE_URL: string;
  INFERENCE_AUTH_TOKEN: string;
  ACTIVE_MODEL_PATH: string;
```

Agregar al `envSchema`:

```typescript
    TRAINING_INTERNAL_TOKEN: joi.string().min(32).required(),
    TRAINING_MIN_REVIEWED_ANALYSES: joi.number().integer().min(1).default(50),
    TRAINING_JOB_TIMEOUT_HOURS: joi.number().integer().min(1).default(6),
    TRAINING_URL: joi.string().uri().required(),
    INFERENCE_URL: joi.string().uri().required(),
    INFERENCE_AUTH_TOKEN: joi.string().required(),
    ACTIVE_MODEL_PATH: joi.string().default('/app/models/active-model.pt'),
```

Agregar al objeto `envs` exportado:

```typescript
  trainingInternalToken: envVars.TRAINING_INTERNAL_TOKEN,
  trainingMinReviewedAnalyses: envVars.TRAINING_MIN_REVIEWED_ANALYSES,
  trainingJobTimeoutHours: envVars.TRAINING_JOB_TIMEOUT_HOURS,
  trainingUrl: envVars.TRAINING_URL,
  inferenceUrl: envVars.INFERENCE_URL,
  inferenceAuthToken: envVars.INFERENCE_AUTH_TOKEN,
  activeModelPath: envVars.ACTIVE_MODEL_PATH,
```

- [ ] **Step 3: Agregar las variables a `.env.example`**

Al final de `fruit-backend/.env.example`, agregar:

```
# Token compartido con fruit-training: entrante en /internal/training/dataset
# y /internal/training-complete, saliente en POST /train.
# Debe coincidir con TRAINING_INTERNAL_TOKEN en fruit-training/.env.
# Generar con: openssl rand -hex 32
TRAINING_INTERNAL_TOKEN=

# Umbral mínimo de análisis revisados nuevos para poder disparar un
# entrenamiento, y horas antes de marcar como FAILED un job RUNNING colgado.
TRAINING_MIN_REVIEWED_ANALYSES=50
TRAINING_JOB_TIMEOUT_HOURS=6

# Token compartido con fruit-inference para POST /internal/prepare-restart
# (mismo valor que INFERENCE_AUTH_TOKEN en fruit-inference/.env).
INFERENCE_AUTH_TOKEN=

# Ruta local (montada como volumen de escritura) donde se escribe el .pt
# promovido — debe apuntar al mismo archivo host que fruit-inference monta
# de solo lectura. Ver docker-compose.yml.
ACTIVE_MODEL_PATH=/app/models/active-model.pt
```

Nota: `TRAINING_URL` e `INFERENCE_URL` no se agregan aquí porque, igual que `DATABASE_URL`/`RABBITMQ_URL`, se inyectan directamente en `docker-compose.yml` (Task 24).

- [ ] **Step 4: Documentar la rotación del token en `SECURITY.md`**

Buscar la sección `### INFERENCE_AUTH_TOKEN` en `SECURITY.md` (raíz del repo) y agregar inmediatamente después una sección análoga:

```markdown
### `TRAINING_INTERNAL_TOKEN`

Token compartido entre `fruit-backend` y `fruit-training`, usado en ambos
sentidos: `fruit-backend` lo envía en `POST /train` (header
`x-training-token`), y `fruit-training` lo envía en
`GET /internal/training/dataset` y `POST /internal/training-complete`.

**Rotación:**
1. Generar un token nuevo: `openssl rand -hex 32`.
2. Actualizar `TRAINING_INTERNAL_TOKEN` en el `.env` de **ambos** servicios
   (`fruit-backend` y `fruit-training`); los valores deben coincidir.
3. Redesplegar/reiniciar ambos servicios juntos, ej.
   `docker compose up -d --build fruit-backend fruit-training`.

**Cadencia recomendada:** la misma que `INTERNAL_NOTIFY_TOKEN`/`INFERENCE_AUTH_TOKEN`
(cada 90 días, o de inmediato ante sospecha de filtración).
```

- [ ] **Step 5: Verificar que el build sigue pasando con el schema de envs actualizado**

Como `envs.ts` valida `process.env` al importarse, correr los tests existentes con las variables nuevas seteadas confirma que el schema es válido:

```bash
cd fruit-backend
TRAINING_INTERNAL_TOKEN=$(openssl rand -hex 32) \
TRAINING_URL=http://localhost:8001 \
INFERENCE_URL=http://localhost:8000 \
INFERENCE_AUTH_TOKEN=test \
pnpm exec jest --listTests > /dev/null && echo OK
```

Expected: `OK` (jest logra cargar todos los archivos de test sin que `envs.ts` lance `Config validation error`).

- [ ] **Step 6: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/package.json fruit-backend/pnpm-lock.yaml fruit-backend/src/config/envs.ts fruit-backend/.env.example SECURITY.md pnpm-lock.yaml
git commit -m "feat(fruit-backend): variables de entorno del pipeline de reentrenamiento"
```

---

## Task 14: `fruit-backend` — `StorageService.downloadBuffer`

**Files:**
- Modify: `fruit-backend/src/storage/ports/storage.port.ts`
- Modify: `fruit-backend/src/storage/storage.service.ts`
- Modify: `fruit-backend/src/storage/storage.service.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

Abrir `fruit-backend/src/storage/storage.service.spec.ts`, revisar el patrón de mocking del `S3Client` ya usado ahí (mock de `send`/comandos), y agregar un `describe('downloadBuffer', ...)` siguiendo ese mismo patrón:

```typescript
describe('downloadBuffer', () => {
  it('concatena los chunks del stream de S3 en un Buffer', async () => {
    const chunks = [Buffer.from('hola '), Buffer.from('mundo')];
    const fakeBody = {
      [Symbol.asyncIterator]: async function* () {
        for (const chunk of chunks) yield chunk;
      },
    };
    (service as any).s3Client = { send: jest.fn().mockResolvedValue({ Body: fakeBody }) };

    const result = await service.downloadBuffer('models/best_v1.pt');

    expect(result).toEqual(Buffer.from('hola mundo'));
  });
});
```

(Ajustar el nombre de la variable `service` y la forma de instanciarla al patrón exacto ya presente al inicio del archivo — el resto de los tests de `storage.service.spec.ts` ya construyen un `StorageService` con un logger mockeado; reutilizar esa misma instancia.)

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd fruit-backend
pnpm exec jest storage.service.spec.ts -t downloadBuffer
```

Expected: FAIL — `service.downloadBuffer is not a function`.

- [ ] **Step 3: Agregar `downloadBuffer` a `IStoragePort`**

En `fruit-backend/src/storage/ports/storage.port.ts`:

```typescript
export interface IStoragePort {
  uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string>;
  getPresignedUrl(key: string, expiresIn: number): Promise<string>;
  downloadBuffer(key: string): Promise<Buffer>;
}
```

- [ ] **Step 4: Implementar `downloadBuffer` en `StorageService`**

En `fruit-backend/src/storage/storage.service.ts`, agregar el import de `GetObjectCommand` (ya está importado) y el método:

```typescript
  async downloadBuffer(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error('Error al descargar archivo', {
        storageKey: key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
```

- [ ] **Step 5: Correr el test y verificar que pasa**

```bash
pnpm exec jest storage.service.spec.ts
```

Expected: PASS (todos los tests del archivo).

- [ ] **Step 6: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/storage
git commit -m "feat(fruit-backend): agregar downloadBuffer a StoragePort"
```

---

## Task 15: `fruit-backend` — DTOs del módulo de entrenamiento

**Files:**
- Create: `fruit-backend/src/training/dto/training-complete.dto.ts`
- Create: `fruit-backend/src/training/training.types.ts`

- [ ] **Step 1: Crear el DTO del callback interno**

`fruit-backend/src/training/dto/training-complete.dto.ts`:

```typescript
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TRAINING_COMPLETE_STATUS = ['COMPLETED', 'FAILED'] as const;
export type TrainingCompleteStatus = (typeof TRAINING_COMPLETE_STATUS)[number];

export class TrainingCompleteDto {
  @ApiProperty()
  @IsUUID()
  jobId: string;

  @ApiProperty({ enum: TRAINING_COMPLETE_STATUS })
  @IsIn(TRAINING_COMPLETE_STATUS)
  status: TrainingCompleteStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mAP?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mAPBase?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  r2Key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  datasetSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
```

- [ ] **Step 2: Crear los tipos compartidos del módulo**

`fruit-backend/src/training/training.types.ts`:

```typescript
export interface TrainingDatasetDeteccion {
  clase: string;
  sano: boolean;
  bbox: [number, number, number, number];
}

export interface TrainingDatasetEntry {
  imageUrl: string;
  detecciones: TrainingDatasetDeteccion[];
}

export interface TrainingStatusResponse {
  activeModel: { version: number; mAP: number | null; promovidoAt: Date | null } | null;
  countNuevosAnalisisRevisados: number;
  umbralMinimo: number;
  activeJob: { id: string; status: string; iniciadoAt: Date } | null;
  historialJobs: Array<{
    id: string;
    status: string;
    datasetSize: number | null;
    errorMessage: string | null;
    iniciadoAt: Date;
    finalizadoAt: Date | null;
  }>;
  historialVersiones: Array<{
    id: string;
    version: number;
    mAP: number | null;
    mAPBase: number | null;
    status: string;
    trainingJobId: string;
    createdAt: Date;
  }>;
}
```

- [ ] **Step 3: Verificar que TypeScript compila (no hay tests unitarios para DTOs/tipos puros)**

```bash
cd fruit-backend
pnpm exec tsc --noEmit -p tsconfig.json
```

Expected: sin nuevos errores atribuibles a estos dos archivos (el proyecto puede tener errores preexistentes no relacionados — ver nota en la sección de Testing del spec y en memoria de la fase 1).

- [ ] **Step 4: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/training
git commit -m "feat(fruit-backend): DTOs y tipos del módulo de entrenamiento"
```

---

## Task 16: `fruit-backend` — `resolveClaseParaEntrenamiento`

**Files:**
- Create: `fruit-backend/src/training/resolve-clase-entrenamiento.ts`
- Create: `fruit-backend/src/training/resolve-clase-entrenamiento.spec.ts`

- [ ] **Step 1: Escribir los tests que fallan**

`fruit-backend/src/training/resolve-clase-entrenamiento.spec.ts`:

```typescript
import { resolveClaseParaEntrenamiento } from './resolve-clase-entrenamiento';

describe('resolveClaseParaEntrenamiento', () => {
  it('retorna "enfermo" sin importar la etapa cuando sano=false', () => {
    expect(resolveClaseParaEntrenamiento('naranja', false)).toBe('enfermo');
    expect(resolveClaseParaEntrenamiento('deteccion_gen', false)).toBe('enfermo');
  });

  it('mapea etapas conocidas 1:1 a su nombre de clase cuando sano=true', () => {
    expect(resolveClaseParaEntrenamiento('boton', true)).toBe('boton');
    expect(resolveClaseParaEntrenamiento('naranja', true)).toBe('naranja');
    expect(resolveClaseParaEntrenamiento('maduro', true)).toBe('maduro');
  });

  it('mapea deteccion_gen a zarzamora cuando sano=true', () => {
    expect(resolveClaseParaEntrenamiento('deteccion_gen', true)).toBe('zarzamora');
  });

  it('lanza un error para una etapa desconocida', () => {
    expect(() => resolveClaseParaEntrenamiento('etapa_inexistente', true)).toThrow();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-backend
pnpm exec jest resolve-clase-entrenamiento.spec.ts
```

Expected: FAIL — `Cannot find module './resolve-clase-entrenamiento'`.

- [ ] **Step 3: Implementar la función**

`fruit-backend/src/training/resolve-clase-entrenamiento.ts`:

```typescript
/**
 * Mapea el { etapa, sano } ya resuelto por resolveDetectionState() de vuelta
 * a un nombre de clase de CLASS_MAP (fruit-inference/fruit-training), para
 * poder exportar el dataset de entrenamiento en formato YOLO.
 */
const ETAPA_A_CLASE: Record<string, string> = {
  boton: 'boton',
  flor: 'flor',
  verde: 'verde',
  naranja: 'naranja',
  marron: 'marron',
  maduro: 'maduro',
  deteccion_gen: 'zarzamora',
};

export function resolveClaseParaEntrenamiento(etapa: string, sano: boolean): string {
  if (!sano) {
    return 'enfermo';
  }
  const clase = ETAPA_A_CLASE[etapa];
  if (!clase) {
    throw new Error(`No se pudo mapear la etapa "${etapa}" a una clase de entrenamiento`);
  }
  return clase;
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm exec jest resolve-clase-entrenamiento.spec.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/training/resolve-clase-entrenamiento.ts fruit-backend/src/training/resolve-clase-entrenamiento.spec.ts
git commit -m "feat(fruit-backend): mapeo etapa+sano a clase de entrenamiento"
```

---

## Task 17: `fruit-backend` — `TrainingService.getStatus` + timeout perezoso

**Files:**
- Create: `fruit-backend/src/training/training.service.ts`
- Create: `fruit-backend/src/training/training.service.spec.ts`

- [ ] **Step 1: Escribir los tests que fallan**

`fruit-backend/src/training/training.service.spec.ts`:

```typescript
import { TrainingService } from './training.service';
import { PrismaService } from '@rubus/database';
import { HttpService } from '@nestjs/axios';
import type { IStoragePort } from '../storage/ports';

describe('TrainingService', () => {
  let prisma: any;
  let storage: { downloadBuffer: jest.Mock; getPresignedUrl: jest.Mock };
  let httpService: { post: jest.Mock };
  let service: TrainingService;

  beforeEach(() => {
    prisma = {
      trainingJob: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      modelVersion: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      analysis: { count: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    storage = { downloadBuffer: jest.fn(), getPresignedUrl: jest.fn() };
    httpService = { post: jest.fn() };
    service = new TrainingService(
      prisma as unknown as PrismaService,
      storage as unknown as IStoragePort,
      httpService as unknown as HttpService,
    );
  });

  describe('getStatus()', () => {
    beforeEach(() => {
      prisma.trainingJob.updateMany.mockResolvedValue({ count: 0 });
      prisma.modelVersion.findFirst.mockResolvedValue(null);
      prisma.trainingJob.findFirst.mockResolvedValue(null);
      prisma.trainingJob.findMany.mockResolvedValue([]);
      prisma.modelVersion.findMany.mockResolvedValue([]);
      prisma.analysis.count.mockResolvedValue(3);
    });

    it('retorna activeModel=null cuando no hay ningún ModelVersion PROMOVIDO', async () => {
      const status = await service.getStatus();

      expect(status.activeModel).toBeNull();
      expect(status.countNuevosAnalisisRevisados).toBe(3);
      expect(status.umbralMinimo).toBe(50);
    });

    it('marca como FAILED los jobs RUNNING que llevan más del timeout', async () => {
      await service.getStatus();

      expect(prisma.trainingJob.updateMany).toHaveBeenCalledWith({
        where: { status: 'RUNNING', iniciadoAt: { lt: expect.any(Date) } },
        data: { status: 'FAILED', errorMessage: 'timeout', finalizadoAt: expect.any(Date) },
      });
    });
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-backend
pnpm exec jest training.service.spec.ts
```

Expected: FAIL — `Cannot find module './training.service'`.

- [ ] **Step 3: Implementar `TrainingService` (constructor + `getStatus` + timeout)**

`fruit-backend/src/training/training.service.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@rubus/database';
import { STORAGE_PORT, type IStoragePort } from '../storage/ports';
import { envs } from '../config/envs';
import type { TrainingStatusResponse } from './training.types';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT)
    private readonly storage: IStoragePort,
    private readonly httpService: HttpService,
  ) {}

  async getStatus(): Promise<TrainingStatusResponse> {
    await this.timeoutStaleRunningJob();

    const [activeModelRow, lastJob, activeJob, historialJobs, historialVersiones] =
      await Promise.all([
        this.prisma.modelVersion.findFirst({ where: { status: 'PROMOVIDO' } }),
        this.prisma.trainingJob.findFirst({ orderBy: { iniciadoAt: 'desc' } }),
        this.prisma.trainingJob.findFirst({
          where: { status: { in: ['PENDING', 'RUNNING'] } },
        }),
        this.prisma.trainingJob.findMany({ orderBy: { iniciadoAt: 'desc' }, take: 20 }),
        this.prisma.modelVersion.findMany({ orderBy: { version: 'desc' }, take: 20 }),
      ]);

    const countNuevos = await this.countNuevosAnalisisDesde(
      this.prisma,
      lastJob?.iniciadoAt ?? null,
    );

    return {
      activeModel: activeModelRow
        ? {
            version: activeModelRow.version,
            mAP: activeModelRow.mAP,
            promovidoAt: activeModelRow.promovidoAt,
          }
        : null,
      countNuevosAnalisisRevisados: countNuevos,
      umbralMinimo: envs.trainingMinReviewedAnalyses,
      activeJob: activeJob
        ? { id: activeJob.id, status: activeJob.status, iniciadoAt: activeJob.iniciadoAt }
        : null,
      historialJobs: historialJobs.map((j) => ({
        id: j.id,
        status: j.status,
        datasetSize: j.datasetSize,
        errorMessage: j.errorMessage,
        iniciadoAt: j.iniciadoAt,
        finalizadoAt: j.finalizadoAt,
      })),
      historialVersiones: historialVersiones.map((v) => ({
        id: v.id,
        version: v.version,
        mAP: v.mAP,
        mAPBase: v.mAPBase,
        status: v.status,
        trainingJobId: v.trainingJobId,
        createdAt: v.createdAt,
      })),
    };
  }

  private async countNuevosAnalisisDesde(
    client: { analysis: { count: (args: unknown) => Promise<number> } },
    since: Date | null,
  ): Promise<number> {
    return client.analysis.count({
      where: {
        deteccionesRevisadas: true,
        ...(since ? { deteccionesRevisadasAt: { gt: since } } : {}),
      },
    });
  }

  private async timeoutStaleRunningJob(): Promise<void> {
    const threshold = new Date(
      Date.now() - envs.trainingJobTimeoutHours * 60 * 60 * 1000,
    );
    await this.prisma.trainingJob.updateMany({
      where: { status: 'RUNNING', iniciadoAt: { lt: threshold } },
      data: { status: 'FAILED', errorMessage: 'timeout', finalizadoAt: new Date() },
    });
  }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm exec jest training.service.spec.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/training/training.service.ts fruit-backend/src/training/training.service.spec.ts
git commit -m "feat(fruit-backend): TrainingService.getStatus con timeout perezoso"
```

---

## Task 18: `fruit-backend` — `TrainingService.createJob`

**Files:**
- Modify: `fruit-backend/src/training/training.service.ts`
- Modify: `fruit-backend/src/training/training.service.spec.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `fruit-backend/src/training/training.service.spec.ts` (dentro del `describe('TrainingService', ...)`, después de `getStatus()`), incluyendo el import de `of` de `rxjs` al inicio del archivo:

```typescript
import { of, throwError } from 'rxjs';
```

```typescript
  describe('createJob()', () => {
    beforeEach(() => {
      prisma.trainingJob.updateMany.mockResolvedValue({ count: 0 });
    });

    it('lanza 409 si ya hay un job PENDING o RUNNING', async () => {
      prisma.trainingJob.findFirst.mockResolvedValueOnce({ id: 'job-activo', status: 'RUNNING' });

      await expect(service.createJob('user-1')).rejects.toThrow('Ya hay un entrenamiento en curso');
    });

    it('lanza 409 si no se alcanza el umbral de análisis revisados nuevos', async () => {
      prisma.trainingJob.findFirst
        .mockResolvedValueOnce(null) // no hay job activo
        .mockResolvedValueOnce(null); // no hay job previo
      prisma.analysis.count.mockResolvedValue(10);

      await expect(service.createJob('user-1')).rejects.toThrow('análisis revisados nuevos');
    });

    it('crea el job, llama a fruit-training y lo marca RUNNING', async () => {
      prisma.trainingJob.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.analysis.count.mockResolvedValue(50);
      prisma.trainingJob.create.mockResolvedValue({ id: 'job-nuevo' });
      prisma.modelVersion.findFirst.mockResolvedValue({ r2Key: 'models/best_v2.pt' });
      httpService.post.mockReturnValue(of({ data: { status: 'accepted' } }));

      const result = await service.createJob('user-1');

      expect(result).toEqual({ jobId: 'job-nuevo' });
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/train'),
        { job_id: 'job-nuevo', base_model_r2_key: 'models/best_v2.pt' },
        expect.objectContaining({ headers: expect.objectContaining({ 'x-training-token': expect.any(String) }) }),
      );
      expect(prisma.trainingJob.update).toHaveBeenCalledWith({
        where: { id: 'job-nuevo' },
        data: { status: 'RUNNING' },
      });
    });

    it('marca el job FAILED si fruit-training no responde', async () => {
      prisma.trainingJob.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.analysis.count.mockResolvedValue(50);
      prisma.trainingJob.create.mockResolvedValue({ id: 'job-nuevo' });
      prisma.modelVersion.findFirst.mockResolvedValue(null);
      httpService.post.mockReturnValue(throwError(() => new Error('connection refused')));

      await expect(service.createJob('user-1')).rejects.toThrow();

      expect(prisma.trainingJob.update).toHaveBeenCalledWith({
        where: { id: 'job-nuevo' },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });
  });
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-backend
pnpm exec jest training.service.spec.ts -t createJob
```

Expected: FAIL — `service.createJob is not a function`.

- [ ] **Step 3: Implementar `createJob`**

En `fruit-backend/src/training/training.service.ts`, actualizar los imports:

```typescript
import { ConflictException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
```

Agregar el método a la clase `TrainingService` (después de `getStatus`):

```typescript
  async createJob(userId: string): Promise<{ jobId: string }> {
    await this.timeoutStaleRunningJob();

    const job = await this.prisma.$transaction(async (tx) => {
      const activeJob = await tx.trainingJob.findFirst({
        where: { status: { in: ['PENDING', 'RUNNING'] } },
      });
      if (activeJob) {
        throw new ConflictException('Ya hay un entrenamiento en curso.');
      }

      const lastJob = await tx.trainingJob.findFirst({ orderBy: { iniciadoAt: 'desc' } });
      const countNuevos = await this.countNuevosAnalisisDesde(tx, lastJob?.iniciadoAt ?? null);
      if (countNuevos < envs.trainingMinReviewedAnalyses) {
        throw new ConflictException(
          `Se requieren al menos ${envs.trainingMinReviewedAnalyses} análisis revisados nuevos desde el último job (hay ${countNuevos}).`,
        );
      }

      return tx.trainingJob.create({ data: { iniciadoPorId: userId } });
    });

    const activeModel = await this.prisma.modelVersion.findFirst({
      where: { status: 'PROMOVIDO' },
    });

    try {
      await firstValueFrom(
        this.httpService.post(
          `${envs.trainingUrl}/train`,
          { job_id: job.id, base_model_r2_key: activeModel?.r2Key ?? null },
          {
            headers: { 'x-training-token': envs.trainingInternalToken },
            timeout: 10_000,
          },
        ),
      );
      await this.prisma.trainingJob.update({
        where: { id: job.id },
        data: { status: 'RUNNING' },
      });
    } catch (error) {
      await this.prisma.trainingJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: 'No se pudo contactar a fruit-training',
          finalizadoAt: new Date(),
        },
      });
      throw new ServiceUnavailableException(
        'No se pudo iniciar el entrenamiento: fruit-training no respondió.',
      );
    }

    return { jobId: job.id };
  }
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm exec jest training.service.spec.ts
```

Expected: PASS (todos, incluidos los de `getStatus()`).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/training/training.service.ts fruit-backend/src/training/training.service.spec.ts
git commit -m "feat(fruit-backend): TrainingService.createJob"
```

---

## Task 19: `fruit-backend` — `TrainingService.recordTrainingComplete`

**Files:**
- Modify: `fruit-backend/src/training/training.service.ts`
- Modify: `fruit-backend/src/training/training.service.spec.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `fruit-backend/src/training/training.service.spec.ts`:

```typescript
  describe('recordTrainingComplete()', () => {
    it('lanza 404 si el job no existe', async () => {
      prisma.trainingJob.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.recordTrainingComplete({ jobId: 'no-existe', status: 'FAILED' } as any),
      ).rejects.toThrow('no encontrado');
    });

    it('marca el job FAILED sin crear ModelVersion cuando status=FAILED', async () => {
      prisma.trainingJob.findUnique = jest.fn().mockResolvedValue({ id: 'job-1' });

      await service.recordTrainingComplete({
        jobId: 'job-1',
        status: 'FAILED',
        errorMessage: 'R2 inaccesible',
      } as any);

      expect(prisma.trainingJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: 'FAILED', errorMessage: 'R2 inaccesible', finalizadoAt: expect.any(Date) },
      });
      expect(prisma.modelVersion.create).not.toHaveBeenCalled();
    });

    it('crea ModelVersion LISTO_PARA_PROMOVER cuando mAP > mAPBase', async () => {
      prisma.trainingJob.findUnique = jest.fn().mockResolvedValue({ id: 'job-1' });
      prisma.modelVersion.aggregate.mockResolvedValue({ _max: { version: 2 } });

      await service.recordTrainingComplete({
        jobId: 'job-1',
        status: 'COMPLETED',
        mAP: 0.8,
        mAPBase: 0.6,
        r2Key: 'models/best_job-1.pt',
        datasetSize: 100,
      } as any);

      expect(prisma.modelVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version: 3,
          status: 'LISTO_PARA_PROMOVER',
          trainingJobId: 'job-1',
        }),
      });
    });

    it('crea ModelVersion DESCARTADO cuando mAP <= mAPBase', async () => {
      prisma.trainingJob.findUnique = jest.fn().mockResolvedValue({ id: 'job-1' });
      prisma.modelVersion.aggregate.mockResolvedValue({ _max: { version: null } });

      await service.recordTrainingComplete({
        jobId: 'job-1',
        status: 'COMPLETED',
        mAP: 0.5,
        mAPBase: 0.6,
        r2Key: 'models/best_job-1.pt',
        datasetSize: 100,
      } as any);

      expect(prisma.modelVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ version: 1, status: 'DESCARTADO' }),
      });
    });
  });
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-backend
pnpm exec jest training.service.spec.ts -t recordTrainingComplete
```

Expected: FAIL — `service.recordTrainingComplete is not a function`.

- [ ] **Step 3: Implementar `recordTrainingComplete`**

Actualizar el import de `@nestjs/common` en `training.service.ts` para incluir `NotFoundException`:

```typescript
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
```

Agregar el import del DTO:

```typescript
import type { TrainingCompleteDto } from './dto/training-complete.dto';
```

Agregar el método a la clase:

```typescript
  async recordTrainingComplete(dto: TrainingCompleteDto): Promise<void> {
    const job = await this.prisma.trainingJob.findUnique({ where: { id: dto.jobId } });
    if (!job) {
      throw new NotFoundException(`TrainingJob "${dto.jobId}" no encontrado`);
    }

    if (dto.status === 'FAILED') {
      await this.prisma.trainingJob.update({
        where: { id: dto.jobId },
        data: {
          status: 'FAILED',
          errorMessage: dto.errorMessage ?? 'Error desconocido',
          finalizadoAt: new Date(),
        },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const maxVersion = await tx.modelVersion.aggregate({ _max: { version: true } });
      const nextVersion = (maxVersion._max.version ?? 0) + 1;
      const mAP = dto.mAP ?? 0;
      const mAPBase = dto.mAPBase ?? 0;

      await tx.modelVersion.create({
        data: {
          version: nextVersion,
          r2Key: dto.r2Key,
          mAP,
          mAPBase,
          status: mAP > mAPBase ? 'LISTO_PARA_PROMOVER' : 'DESCARTADO',
          trainingJobId: dto.jobId,
        },
      });

      await tx.trainingJob.update({
        where: { id: dto.jobId },
        data: { status: 'COMPLETED', datasetSize: dto.datasetSize, finalizadoAt: new Date() },
      });
    });
  }
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm exec jest training.service.spec.ts
```

Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/training/training.service.ts fruit-backend/src/training/training.service.spec.ts
git commit -m "feat(fruit-backend): TrainingService.recordTrainingComplete"
```

---

## Task 20: `fruit-backend` — `TrainingService.getDataset`

**Files:**
- Modify: `fruit-backend/src/training/training.service.ts`
- Modify: `fruit-backend/src/training/training.service.spec.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `fruit-backend/src/training/training.service.spec.ts`:

```typescript
  describe('getDataset()', () => {
    it('excluye detecciones eliminadas y omite análisis sin detecciones restantes', async () => {
      prisma.analysis.findMany.mockResolvedValue([
        {
          storageKey: 'raw/analysis-1.jpg',
          detections: [
            {
              id: 'd1',
              origen: 'MODELO',
              confidence: 0.9,
              etapaDetectada: 'naranja',
              saludDetectada: 'SANO',
              bboxX1: 1, bboxY1: 2, bboxX2: 3, bboxY2: 4,
              feedback: [],
            },
            {
              id: 'd2',
              origen: 'MODELO',
              confidence: 0.8,
              etapaDetectada: 'verde',
              saludDetectada: 'SANO',
              bboxX1: 5, bboxY1: 6, bboxX2: 7, bboxY2: 8,
              feedback: [{ accion: 'ELIMINAR', etapaCorregida: null, saludCorregida: null, bboxX1: null, bboxY1: null, bboxX2: null, bboxY2: null }],
            },
          ],
        },
        {
          storageKey: 'raw/analysis-2.jpg',
          detections: [
            {
              id: 'd3',
              origen: 'MODELO',
              confidence: 0.7,
              etapaDetectada: 'verde',
              saludDetectada: 'SANO',
              bboxX1: 0, bboxY1: 0, bboxX2: 0, bboxY2: 0,
              feedback: [{ accion: 'ELIMINAR', etapaCorregida: null, saludCorregida: null, bboxX1: null, bboxY1: null, bboxX2: null, bboxY2: null }],
            },
          ],
        },
      ]);
      storage.getPresignedUrl.mockResolvedValue('https://signed/analysis-1.jpg');

      const dataset = await service.getDataset();

      expect(dataset).toEqual([
        {
          imageUrl: 'https://signed/analysis-1.jpg',
          detecciones: [{ clase: 'naranja', sano: true, bbox: [1, 2, 3, 4] }],
        },
      ]);
    });

    it('mapea saludCorregida=ENFERMO a la clase "enfermo" sin importar la etapa', async () => {
      prisma.analysis.findMany.mockResolvedValue([
        {
          storageKey: 'raw/analysis-1.jpg',
          detections: [
            {
              id: 'd1',
              origen: 'MODELO',
              confidence: 0.9,
              etapaDetectada: 'naranja',
              saludDetectada: 'SANO',
              bboxX1: 1, bboxY1: 2, bboxX2: 3, bboxY2: 4,
              feedback: [{ accion: 'EDITAR', etapaCorregida: null, saludCorregida: 'ENFERMO', bboxX1: null, bboxY1: null, bboxX2: null, bboxY2: null }],
            },
          ],
        },
      ]);
      storage.getPresignedUrl.mockResolvedValue('https://signed/analysis-1.jpg');

      const dataset = await service.getDataset();

      expect(dataset[0].detecciones).toEqual([{ clase: 'enfermo', sano: false, bbox: [1, 2, 3, 4] }]);
    });
  });
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-backend
pnpm exec jest training.service.spec.ts -t getDataset
```

Expected: FAIL — `service.getDataset is not a function`.

- [ ] **Step 3: Implementar `getDataset`**

Agregar los imports en `training.service.ts`:

```typescript
import { resolveDetectionState } from '../analyses/detection-state.util';
import { resolveClaseParaEntrenamiento } from './resolve-clase-entrenamiento';
import type { TrainingDatasetEntry } from './training.types';
```

Agregar el método a la clase:

```typescript
  async getDataset(): Promise<TrainingDatasetEntry[]> {
    const analyses = await this.prisma.analysis.findMany({
      where: { deteccionesRevisadas: true },
      select: {
        storageKey: true,
        detections: {
          include: { feedback: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    });

    const entries: TrainingDatasetEntry[] = [];
    for (const analysis of analyses) {
      const detecciones = analysis.detections
        .map((detection) => resolveDetectionState(detection))
        .filter((resolved) => !resolved.eliminada)
        .map((resolved) => ({
          clase: resolveClaseParaEntrenamiento(resolved.etapa, resolved.sano),
          sano: resolved.sano,
          bbox: resolved.bbox,
        }));

      if (detecciones.length === 0) continue;

      const imageUrl = await this.storage.getPresignedUrl(analysis.storageKey, 900);
      entries.push({ imageUrl, detecciones });
    }
    return entries;
  }
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm exec jest training.service.spec.ts
```

Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/training/training.service.ts fruit-backend/src/training/training.service.spec.ts
git commit -m "feat(fruit-backend): TrainingService.getDataset"
```

---

## Task 21: `fruit-backend` — `TrainingService.promote`

**Files:**
- Modify: `fruit-backend/src/training/training.service.ts`
- Modify: `fruit-backend/src/training/training.service.spec.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `fruit-backend/src/training/training.service.spec.ts`. Mockear `fs/promises` al inicio del archivo (antes del primer `describe`), y agregar el `describe('promote()', ...)`:

```typescript
jest.mock('fs/promises', () => ({ writeFile: jest.fn().mockResolvedValue(undefined) }));
```

```typescript
  describe('promote()', () => {
    it('lanza 404 si no hay ModelVersion asociado al job', async () => {
      prisma.modelVersion.findUnique.mockResolvedValue(null);

      await expect(service.promote('job-1', 'user-1')).rejects.toThrow('No hay una versión');
    });

    it('lanza 400 si el estado no es promovible', async () => {
      prisma.modelVersion.findUnique.mockResolvedValue({
        id: 'mv-1', version: 2, status: 'DESCARTADO', r2Key: 'models/x.pt',
      });

      await expect(service.promote('job-1', 'user-1')).rejects.toThrow('no se puede promover');
    });

    it('descarga el .pt, reinicia fruit-inference y marca PROMOVIDO/REEMPLAZADO', async () => {
      prisma.modelVersion.findUnique.mockResolvedValue({
        id: 'mv-2', version: 3, status: 'LISTO_PARA_PROMOVER', r2Key: 'models/best_job-1.pt',
      });
      prisma.modelVersion.findFirst.mockResolvedValue({ id: 'mv-1', status: 'PROMOVIDO' });
      prisma.modelVersion.update.mockResolvedValue({ id: 'mv-2', status: 'PROMOVIDO' });
      storage.downloadBuffer.mockResolvedValue(Buffer.from('modelo'));
      httpService.post.mockReturnValue(of({ data: { status: 'restarting' } }));

      const result = await service.promote('job-1', 'user-1');

      expect(storage.downloadBuffer).toHaveBeenCalledWith('models/best_job-1.pt');
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/internal/prepare-restart'),
        {},
        expect.objectContaining({ headers: expect.objectContaining({ 'x-inference-token': expect.any(String) }) }),
      );
      expect(prisma.modelVersion.update).toHaveBeenCalledWith({
        where: { id: 'mv-1' },
        data: { status: 'REEMPLAZADO' },
      });
      expect(prisma.modelVersion.update).toHaveBeenCalledWith({
        where: { id: 'mv-2' },
        data: { status: 'PROMOVIDO', promovidoPorId: 'user-1', promovidoAt: expect.any(Date) },
      });
      expect(result).toEqual({ id: 'mv-2', status: 'PROMOVIDO' });
    });

    it('no marca la promoción como exitosa si fruit-inference no responde', async () => {
      prisma.modelVersion.findUnique.mockResolvedValue({
        id: 'mv-2', version: 3, status: 'LISTO_PARA_PROMOVER', r2Key: 'models/best_job-1.pt',
      });
      storage.downloadBuffer.mockResolvedValue(Buffer.from('modelo'));
      httpService.post.mockReturnValue(throwError(() => new Error('timeout')));

      await expect(service.promote('job-1', 'user-1')).rejects.toThrow();

      expect(prisma.modelVersion.update).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-backend
pnpm exec jest training.service.spec.ts -t promote
```

Expected: FAIL — `service.promote is not a function`.

- [ ] **Step 3: Implementar `promote`**

Agregar el import de `fs/promises` en `training.service.ts`:

```typescript
import { writeFile } from 'fs/promises';
```

Agregar `BadRequestException` al import de `@nestjs/common`:

```typescript
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
```

Agregar el método a la clase:

```typescript
  async promote(jobId: string, userId: string) {
    const modelVersion = await this.prisma.modelVersion.findUnique({
      where: { trainingJobId: jobId },
    });
    if (!modelVersion) {
      throw new NotFoundException(`No hay una versión de modelo asociada al job "${jobId}"`);
    }
    if (!['LISTO_PARA_PROMOVER', 'REEMPLAZADO'].includes(modelVersion.status)) {
      throw new BadRequestException(
        `La versión ${modelVersion.version} no se puede promover (estado actual: ${modelVersion.status})`,
      );
    }
    if (!modelVersion.r2Key) {
      throw new BadRequestException(
        `La versión ${modelVersion.version} no tiene un archivo de modelo asociado`,
      );
    }

    try {
      const buffer = await this.storage.downloadBuffer(modelVersion.r2Key);
      await writeFile(envs.activeModelPath, buffer);
      await firstValueFrom(
        this.httpService.post(
          `${envs.inferenceUrl}/internal/prepare-restart`,
          {},
          { headers: { 'x-inference-token': envs.inferenceAuthToken }, timeout: 10_000 },
        ),
      );
    } catch (error) {
      throw new ServiceUnavailableException(
        `No se pudo completar la promoción de la versión ${modelVersion.version}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const currentlyPromoted = await tx.modelVersion.findFirst({
        where: { status: 'PROMOVIDO' },
      });
      if (currentlyPromoted && currentlyPromoted.id !== modelVersion.id) {
        await tx.modelVersion.update({
          where: { id: currentlyPromoted.id },
          data: { status: 'REEMPLAZADO' },
        });
      }
      return tx.modelVersion.update({
        where: { id: modelVersion.id },
        data: { status: 'PROMOVIDO', promovidoPorId: userId, promovidoAt: new Date() },
      });
    });
  }
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm exec jest training.service.spec.ts
```

Expected: PASS (todos — la suite completa del servicio).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/training/training.service.ts fruit-backend/src/training/training.service.spec.ts
git commit -m "feat(fruit-backend): TrainingService.promote"
```

---

## Task 22: `fruit-backend` — `TrainingController` (endpoints ADMIN)

**Files:**
- Create: `fruit-backend/src/training/training.controller.ts`
- Create: `fruit-backend/src/training/training.controller.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

`fruit-backend/src/training/training.controller.spec.ts`:

```typescript
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

describe('TrainingController', () => {
  let trainingService: {
    getStatus: jest.Mock;
    createJob: jest.Mock;
    promote: jest.Mock;
  };
  let controller: TrainingController;

  beforeEach(() => {
    trainingService = {
      getStatus: jest.fn(),
      createJob: jest.fn(),
      promote: jest.fn(),
    };
    controller = new TrainingController(trainingService as unknown as TrainingService);
  });

  it('getStatus() delega en TrainingService', async () => {
    trainingService.getStatus.mockResolvedValue({ activeModel: null });

    const result = await controller.getStatus();

    expect(result).toEqual({ activeModel: null });
  });

  it('createJob() delega el userId del JWT', async () => {
    trainingService.createJob.mockResolvedValue({ jobId: 'job-1' });

    const result = await controller.createJob({ user: { sub: 'user-1' } } as any);

    expect(trainingService.createJob).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ jobId: 'job-1' });
  });

  it('promote() delega el id del job y el userId del JWT', async () => {
    trainingService.promote.mockResolvedValue({ id: 'mv-1', status: 'PROMOVIDO' });

    const result = await controller.promote('job-1', { user: { sub: 'user-1' } } as any);

    expect(trainingService.promote).toHaveBeenCalledWith('job-1', 'user-1');
    expect(result).toEqual({ id: 'mv-1', status: 'PROMOVIDO' });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd fruit-backend
pnpm exec jest training.controller.spec.ts
```

Expected: FAIL — `Cannot find module './training.controller'`.

- [ ] **Step 3: Implementar `TrainingController`**

`fruit-backend/src/training/training.controller.ts`:

```typescript
import { Controller, Get, Post, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';

@ApiTags('Training')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @ApiOperation({
    summary: 'Estado del pipeline de reentrenamiento',
    description:
      'Modelo activo, contador de análisis revisados nuevos, umbral mínimo, job activo e historial.',
  })
  @ApiResponse({ status: 200, description: 'Estado recuperado con éxito.' })
  @ApiResponse({ status: 403, description: 'Solo ADMIN puede acceder.' })
  @Get('status')
  async getStatus() {
    return this.trainingService.getStatus();
  }

  @ApiOperation({
    summary: 'Iniciar un entrenamiento nuevo',
    description:
      'Crea un TrainingJob y dispara el fine-tuning en fruit-training. 409 si ya hay un job activo o no se alcanza el umbral mínimo.',
  })
  @ApiResponse({ status: 201, description: 'Job creado y disparado con éxito.' })
  @ApiResponse({ status: 409, description: 'Ya hay un job activo, o no se alcanza el umbral.' })
  @Post('jobs')
  async createJob(@Req() req: { user: JwtPayload }) {
    return this.trainingService.createJob(req.user.sub);
  }

  @ApiOperation({
    summary: 'Promover una versión del modelo',
    description:
      'Promueve el ModelVersion asociado a un job (LISTO_PARA_PROMOVER o REEMPLAZADO — cubre promoción normal y rollback).',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'UUID del TrainingJob.' })
  @ApiResponse({ status: 200, description: 'Versión promovida con éxito.' })
  @ApiResponse({ status: 400, description: 'La versión no está en un estado promovible.' })
  @ApiResponse({ status: 404, description: 'No hay una versión asociada a ese job.' })
  @Post('jobs/:id/promote')
  async promote(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    return this.trainingService.promote(id, req.user.sub);
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
pnpm exec jest training.controller.spec.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/training/training.controller.ts fruit-backend/src/training/training.controller.spec.ts
git commit -m "feat(fruit-backend): TrainingController (endpoints ADMIN)"
```

---

## Task 23: `fruit-backend` — `TrainingInternalController` + wiring del módulo

**Files:**
- Create: `fruit-backend/src/training/training-internal.controller.ts`
- Create: `fruit-backend/src/training/training-internal.controller.spec.ts`
- Create: `fruit-backend/src/training/training.module.ts`
- Modify: `fruit-backend/src/app.module.ts`

- [ ] **Step 1: Escribir los tests que fallan**

`fruit-backend/src/training/training-internal.controller.spec.ts`:

```typescript
import { TrainingInternalController } from './training-internal.controller';
import { TrainingService } from './training.service';
import { UnauthorizedException } from '@nestjs/common';

describe('TrainingInternalController', () => {
  const TOKEN = 'test-training-token';
  let trainingService: { getDataset: jest.Mock; recordTrainingComplete: jest.Mock };
  let controller: TrainingInternalController;

  beforeEach(() => {
    process.env.TRAINING_INTERNAL_TOKEN = TOKEN;
    trainingService = { getDataset: jest.fn(), recordTrainingComplete: jest.fn() };
    controller = new TrainingInternalController(trainingService as unknown as TrainingService);
  });

  describe('getDataset()', () => {
    it('rechaza un token inválido', async () => {
      await expect(controller.getDataset('wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('delega en TrainingService con un token válido', async () => {
      trainingService.getDataset.mockResolvedValue([]);

      const result = await controller.getDataset(TOKEN);

      expect(result).toEqual([]);
    });
  });

  describe('trainingComplete()', () => {
    it('rechaza un token inválido', async () => {
      await expect(
        controller.trainingComplete('wrong', { jobId: 'job-1', status: 'FAILED' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delega en TrainingService con un token válido', async () => {
      await controller.trainingComplete(TOKEN, { jobId: 'job-1', status: 'FAILED' } as any);

      expect(trainingService.recordTrainingComplete).toHaveBeenCalledWith({
        jobId: 'job-1',
        status: 'FAILED',
      });
    });
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd fruit-backend
pnpm exec jest training-internal.controller.spec.ts
```

Expected: FAIL — `Cannot find module './training-internal.controller'`.

- [ ] **Step 3: Implementar `TrainingInternalController`**

`fruit-backend/src/training/training-internal.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { TrainingCompleteDto } from './dto/training-complete.dto';
import { envs } from '../config/envs';

@ApiExcludeController()
@Controller('internal')
export class TrainingInternalController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('training/dataset')
  async getDataset(@Headers('x-training-token') token: string) {
    this.assertToken(token);
    return this.trainingService.getDataset();
  }

  @Post('training-complete')
  @HttpCode(204)
  async trainingComplete(
    @Headers('x-training-token') token: string,
    @Body() dto: TrainingCompleteDto,
  ) {
    this.assertToken(token);
    await this.trainingService.recordTrainingComplete(dto);
  }

  private assertToken(token: string): void {
    if (!envs.trainingInternalToken || token !== envs.trainingInternalToken) {
      throw new UnauthorizedException('Invalid training token');
    }
  }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm exec jest training-internal.controller.spec.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Crear `training.module.ts`**

`fruit-backend/src/training/training.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrainingController } from './training.controller';
import { TrainingInternalController } from './training-internal.controller';
import { TrainingService } from './training.service';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AuthModule, StorageModule, HttpModule],
  controllers: [TrainingController, TrainingInternalController],
  providers: [TrainingService],
})
export class TrainingModule {}
```

- [ ] **Step 6: Registrar `TrainingModule` en `app.module.ts`**

En `fruit-backend/src/app.module.ts`, agregar el import:

```typescript
import { TrainingModule } from './training/training.module';
```

Y agregarlo a la lista de `imports` (después de `AnalysesModule`):

```typescript
    AnalysesModule,
    TrainingModule,
    LoggingModule,
```

- [ ] **Step 7: Correr toda la suite de `fruit-backend` para verificar que el módulo se registra sin romper nada**

```bash
cd fruit-backend
TRAINING_INTERNAL_TOKEN=$(openssl rand -hex 32) \
TRAINING_URL=http://localhost:8001 \
INFERENCE_URL=http://localhost:8000 \
INFERENCE_AUTH_TOKEN=test \
pnpm exec jest
```

Expected: PASS (toda la suite; el archivo `.env` local ya debería tener las variables reales seteadas para desarrollo normal, este export es solo para que la corrida de jest en CI/sandbox tenga las nuevas vars requeridas).

- [ ] **Step 8: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add fruit-backend/src/training fruit-backend/src/app.module.ts
git commit -m "feat(fruit-backend): TrainingInternalController y wiring del módulo"
```

---

## Task 24: `docker-compose.yml` — servicio `fruit-training` + infraestructura de promoción

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Agregar `restart: unless-stopped` a `fruit-inference`**

En el bloque `fruit-inference:` de `docker-compose.yml`, agregar la línea `restart: unless-stopped` (por ejemplo, justo debajo de `build: ./fruit-inference`):

```yaml
  fruit-inference:
    build: ./fruit-inference
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"
```

- [ ] **Step 2: Agregar el volumen de escritura y las variables nuevas a `fruit-backend`**

En el bloque `fruit-backend:`, agregar `volumes:` y las variables `INFERENCE_URL`/`TRAINING_URL` al bloque `environment:` ya existente:

```yaml
  fruit-backend:
    build:
      context: .
      dockerfile: fruit-backend/Dockerfile
    ports:
      - "3001:3000"
    env_file: ./fruit-backend/.env
    environment:
      DATABASE_URL: "postgresql://rubus:rubus_dev@postgres:5432/rubusai"
      RABBITMQ_URL: "amqp://guest:guest@rabbitmq:5672"
      REDIS_URL: "redis://redis:6379"
      INFERENCE_URL: "http://fruit-inference:8000"
      TRAINING_URL: "http://fruit-training:8001"
    volumes:
      - ./fruit-inference/best.pt:/app/models/active-model.pt
    depends_on:
      rabbitmq:
        condition: service_healthy
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

Nota: este mismo archivo host (`./fruit-inference/best.pt`) queda montado tres veces — de solo lectura en `fruit-inference` y `fruit-training`, de escritura en `fruit-backend`. Es intencional: los tres necesitan verlo, pero solo `fruit-backend` lo reemplaza (al promover).

- [ ] **Step 3: Agregar el servicio `fruit-training`**

Después del bloque `fruit-ms:` (antes de `zarza-web:`), agregar:

```yaml
  # ── Servicio de entrenamiento Python (fine-tuning YOLO) ──────────────────────
  fruit-training:
    build: ./fruit-training
    env_file: ./fruit-training/.env
    environment:
      BACKEND_URL: "http://fruit-backend:3000"
    volumes:
      - ./fruit-inference/best.pt:/app/base-model.pt:ro
    depends_on:
      fruit-backend:
        condition: service_healthy
    networks: [fruit-net]
    healthcheck:
      test:
        [
          "CMD",
          "python",
          "-c",
          "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')",
        ]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 15s
```

- [ ] **Step 4: Verificar que el compose file es sintácticamente válido**

```bash
cd /home/san/Proyectos/zarza-workspace
docker compose config --quiet
```

Expected: sin salida (exit code 0) — el YAML es válido y todas las referencias resuelven.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker-compose): agregar servicio fruit-training e infraestructura de promoción"
```

---

## Task 25: `zarza-web` — tipos y hooks

**Files:**
- Create: `zarza-web/src/modelos-ia/types.ts`
- Create: `zarza-web/src/modelos-ia/useTrainingStatus.ts`

- [ ] **Step 1: Crear los tipos**

`zarza-web/src/modelos-ia/types.ts`:

```typescript
export type TrainingJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type ModelVersionStatus =
  | 'ENTRENADO'
  | 'LISTO_PARA_PROMOVER'
  | 'DESCARTADO'
  | 'PROMOVIDO'
  | 'REEMPLAZADO';

export interface ActiveModel {
  version: number;
  mAP: number | null;
  promovidoAt: string | null;
}

export interface ActiveJob {
  id: string;
  status: TrainingJobStatus;
  iniciadoAt: string;
}

export interface TrainingJobHistoryItem {
  id: string;
  status: TrainingJobStatus;
  datasetSize: number | null;
  errorMessage: string | null;
  iniciadoAt: string;
  finalizadoAt: string | null;
}

export interface ModelVersionHistoryItem {
  id: string;
  version: number;
  mAP: number | null;
  mAPBase: number | null;
  status: ModelVersionStatus;
  trainingJobId: string;
  createdAt: string;
}

export interface TrainingStatus {
  activeModel: ActiveModel | null;
  countNuevosAnalisisRevisados: number;
  umbralMinimo: number;
  activeJob: ActiveJob | null;
  historialJobs: TrainingJobHistoryItem[];
  historialVersiones: ModelVersionHistoryItem[];
}
```

- [ ] **Step 2: Crear los hooks**

`zarza-web/src/modelos-ia/useTrainingStatus.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { TrainingStatus } from './types';

export function useTrainingStatus() {
  return useQuery<TrainingStatus>({
    queryKey: ['training', 'status'],
    queryFn: () => apiClient.get<TrainingStatus>('/training/status').then((r) => r.data),
    refetchInterval: (query) => (query.state.data?.activeJob ? 15_000 : false),
  });
}

export function useIniciarEntrenamiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ jobId: string }>('/training/jobs').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'status'] }),
  });
}

export function usePromoverVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post(`/training/jobs/${jobId}/promote`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'status'] }),
  });
}
```

- [ ] **Step 3: Verificar que TypeScript compila**

```bash
cd zarza-web
npx tsc -b --noEmit
```

Expected: sin nuevos errores atribuibles a estos dos archivos.

- [ ] **Step 4: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add zarza-web/src/modelos-ia
git commit -m "feat(zarza-web): tipos y hooks de Modelos IA"
```

---

## Task 26: `zarza-web` — `ModelosIAPage` (3 tabs)

**Files:**
- Create: `zarza-web/src/modelos-ia/ModelosIAPage.tsx`

- [ ] **Step 1: Implementar la página**

`zarza-web/src/modelos-ia/ModelosIAPage.tsx`:

```tsx
import { useState } from 'react';
import { Button, Descriptions, Table, Tabs, Tag, Tooltip, Typography, notification } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  useIniciarEntrenamiento,
  usePromoverVersion,
  useTrainingStatus,
} from './useTrainingStatus';
import type { ModelVersionHistoryItem, TrainingJobHistoryItem } from './types';

const { Title, Text } = Typography;

const JOB_STATUS_TAG: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'default', label: 'Pendiente' },
  RUNNING: { color: 'processing', label: 'Corriendo' },
  COMPLETED: { color: 'success', label: 'Completado' },
  FAILED: { color: 'error', label: 'Fallido' },
};

const VERSION_STATUS_TAG: Record<string, { color: string; label: string }> = {
  ENTRENADO: { color: 'default', label: 'Entrenado' },
  LISTO_PARA_PROMOVER: { color: 'gold', label: 'Listo para promover' },
  DESCARTADO: { color: 'default', label: 'Descartado' },
  PROMOVIDO: { color: 'green', label: 'Promovido' },
  REEMPLAZADO: { color: 'default', label: 'Reemplazado' },
};

function EstadoActualTab() {
  const { data, isLoading } = useTrainingStatus();
  const iniciar = useIniciarEntrenamiento();

  if (isLoading || !data) return <Text>Cargando...</Text>;

  const { activeModel, countNuevosAnalisisRevisados, umbralMinimo, activeJob } = data;
  const disabledReason = activeJob
    ? 'Ya hay un entrenamiento en curso'
    : countNuevosAnalisisRevisados < umbralMinimo
      ? `Se necesitan ${umbralMinimo} análisis revisados nuevos (hay ${countNuevosAnalisisRevisados})`
      : null;

  async function handleIniciar() {
    try {
      await iniciar.mutateAsync();
      notification.success({ message: 'Entrenamiento iniciado' });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo iniciar el entrenamiento';
      notification.error({ message });
    }
  }

  return (
    <div>
      <Descriptions column={1} bordered size="small" style={{ maxWidth: 480 }}>
        <Descriptions.Item label="Modelo activo">
          {activeModel ? `Versión ${activeModel.version}` : 'Ninguno (usando best.pt original)'}
        </Descriptions.Item>
        <Descriptions.Item label="mAP@0.5">
          {activeModel?.mAP != null ? activeModel.mAP.toFixed(4) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Promovido">
          {activeModel?.promovidoAt
            ? new Date(activeModel.promovidoAt).toLocaleString('es-MX')
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Análisis revisados nuevos">
          {countNuevosAnalisisRevisados} / {umbralMinimo}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16 }}>
        <Tooltip title={disabledReason ?? ''}>
          <Button
            type="primary"
            disabled={!!disabledReason}
            loading={iniciar.isPending}
            onClick={handleIniciar}
          >
            Iniciar nuevo entrenamiento
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

function HistorialVersionesTab() {
  const { data, isLoading } = useTrainingStatus();
  const promover = usePromoverVersion();

  const columns: ColumnsType<ModelVersionHistoryItem> = [
    { title: 'Versión', dataIndex: 'version', key: 'version' },
    {
      title: 'mAP vs base',
      key: 'map',
      render: (_: unknown, record: ModelVersionHistoryItem) =>
        `${record.mAP?.toFixed(4) ?? '—'} vs ${record.mAPBase?.toFixed(4) ?? '—'}`,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const tag = VERSION_STATUS_TAG[status] ?? VERSION_STATUS_TAG['ENTRENADO'];
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
    },
    {
      title: 'Acción',
      key: 'accion',
      render: (_: unknown, record: ModelVersionHistoryItem) =>
        record.status === 'LISTO_PARA_PROMOVER' || record.status === 'REEMPLAZADO' ? (
          <Button
            size="small"
            type="primary"
            loading={promover.isPending && promover.variables === record.trainingJobId}
            onClick={async () => {
              try {
                await promover.mutateAsync(record.trainingJobId);
                notification.success({ message: `Versión ${record.version} promovida` });
              } catch {
                notification.error({ message: 'No se pudo promover la versión' });
              }
            }}
          >
            Promover
          </Button>
        ) : null,
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data?.historialVersiones ?? []}
      columns={columns}
      pagination={false}
    />
  );
}

function JobsEntrenamientoTab() {
  const { data, isLoading } = useTrainingStatus();

  const columns: ColumnsType<TrainingJobHistoryItem> = [
    {
      title: 'Inicio',
      dataIndex: 'iniciadoAt',
      key: 'iniciadoAt',
      render: (v: string) => new Date(v).toLocaleString('es-MX'),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const tag = JOB_STATUS_TAG[status] ?? JOB_STATUS_TAG['PENDING'];
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Duración',
      key: 'duracion',
      render: (_: unknown, record: TrainingJobHistoryItem) => {
        if (!record.finalizadoAt) return '—';
        const ms =
          new Date(record.finalizadoAt).getTime() - new Date(record.iniciadoAt).getTime();
        return `${Math.round(ms / 60000)} min`;
      },
    },
    {
      title: 'Tamaño dataset',
      dataIndex: 'datasetSize',
      key: 'datasetSize',
      render: (v: number | null) => v ?? '—',
    },
    {
      title: 'Error',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      render: (v: string | null) => v ?? '—',
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data?.historialJobs ?? []}
      columns={columns}
      pagination={false}
    />
  );
}

export function ModelosIAPage() {
  const [tab, setTab] = useState('estado');

  return (
    <div>
      <Title level={3}>Modelos IA</Title>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'estado', label: 'Estado actual', children: <EstadoActualTab /> },
          { key: 'historial', label: 'Historial de versiones', children: <HistorialVersionesTab /> },
          { key: 'jobs', label: 'Jobs de entrenamiento', children: <JobsEntrenamientoTab /> },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
cd zarza-web
npx tsc -b --noEmit
```

Expected: sin nuevos errores.

- [ ] **Step 3: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add zarza-web/src/modelos-ia/ModelosIAPage.tsx
git commit -m "feat(zarza-web): pantalla Modelos IA con 3 tabs"
```

---

## Task 27: `zarza-web` — ruta y navegación

**Files:**
- Modify: `zarza-web/src/App.tsx`
- Modify: `zarza-web/src/shared/AppShell.tsx`

- [ ] **Step 1: Agregar la ruta en `App.tsx`**

En `zarza-web/src/App.tsx`, agregar el import:

```typescript
import { ModelosIAPage } from './modelos-ia/ModelosIAPage';
```

Agregar el bloque de ruta ADMIN-only, después del bloque de `/revision-detecciones` y antes del cierre de `<Route element={<AppShell />}>`:

```tsx
          <Route element={<PrivateRoute allowedRoles={[Role.ADMIN]} />}>
            <Route path="/modelos-ia" element={<ModelosIAPage />} />
          </Route>
```

- [ ] **Step 2: Agregar el enlace en el sidebar**

En `zarza-web/src/shared/AppShell.tsx`, agregar al arreglo `GROUP_ADMIN`:

```typescript
const GROUP_ADMIN: NavItem[] = [
  { key: '/usuarios', label: 'Usuarios', roles: [Role.ADMIN] },
  { key: '/modelos-ia', label: 'Modelos IA', roles: [Role.ADMIN] },
];
```

- [ ] **Step 3: Verificar que TypeScript compila**

```bash
cd zarza-web
npx tsc -b --noEmit
```

Expected: sin nuevos errores.

- [ ] **Step 4: Levantar el dev server y verificar manualmente**

```bash
npm run dev
```

Navegar a `http://localhost:5173/modelos-ia` logueado como ADMIN: la página carga con 3 tabs, "Estado actual" muestra el modelo activo (ninguno todavía) y el contador de análisis revisados. Logueado como AGRONOMO/PRODUCTOR/MONITOR, la ruta no aparece en el sidebar y navegar directo a `/modelos-ia` redirige a `/403`.

- [ ] **Step 5: Commit**

```bash
cd /home/san/Proyectos/zarza-workspace
git add zarza-web/src/App.tsx zarza-web/src/shared/AppShell.tsx
git commit -m "feat(zarza-web): ruta y navegación de Modelos IA"
```

---

## Task 28: Verificación E2E manual

**No hay archivos que crear/modificar** — esta tarea es una checklist de verificación manual contra el stack completo levantado con Docker.

- [ ] **Step 1: Reconstruir todas las imágenes afectadas**

```bash
cd /home/san/Proyectos/zarza-workspace
docker compose up --build -d
```

Expected: los 6 servicios (`postgres`, `rabbitmq`, `redis`, `fruit-backend`, `fruit-inference`, `fruit-ms`, `fruit-training`, `zarza-web`) levantan sanos (`docker compose ps` muestra todos `healthy`/`running`).

- [ ] **Step 2: Bajar temporalmente el umbral mínimo para poder disparar un job con pocos datos**

En `fruit-backend/.env`, setear `TRAINING_MIN_REVIEWED_ANALYSES=1` (o el número de análisis ya revisados que existan de la verificación E2E de la fase 1) y:

```bash
docker compose up -d --build fruit-backend
```

- [ ] **Step 3: Confirmar que `GET /training/status` refleja el estado inicial**

Loguearse como ADMIN en `zarza-web` (`/modelos-ia`, tab "Estado actual"): `activeModel: null`, contador de análisis revisados nuevos visible, botón "Iniciar nuevo entrenamiento" habilitado si hay al menos 1 análisis revisado.

- [ ] **Step 4: Disparar un job y verificar el flujo completo**

Click en "Iniciar nuevo entrenamiento". Confirmar:
- El job aparece en la tab "Jobs de entrenamiento" con estado `PENDING` y luego `RUNNING`.
- `docker compose logs -f fruit-training` muestra la descarga del dataset, el fine-tuning corriendo, y el reporte final.
- Al completar, el job pasa a `COMPLETED` y aparece una fila nueva en "Historial de versiones" con estado `LISTO_PARA_PROMOVER` o `DESCARTADO` según el mAP resultante.

- [ ] **Step 5: Promover la versión (si quedó `LISTO_PARA_PROMOVER`)**

Click en "Promover". Confirmar:
- `docker compose logs fruit-backend` muestra la descarga de R2 y la llamada a `fruit-inference`.
- `docker compose logs fruit-inference` muestra el proceso terminando (`os._exit(0)`) y Docker relanzándolo (`docker compose ps` muestra el contenedor con un uptime reciente).
- La tab "Historial de versiones" refleja la versión como `PROMOVIDO` y "Estado actual" ahora muestra esa versión como modelo activo.

- [ ] **Step 6: Verificar el rollback**

Si existe una versión `REEMPLAZADO` (de una promoción anterior en esta misma verificación), click en "Promover" sobre esa fila y confirmar que el flujo se repite y esa versión vuelve a quedar `PROMOVIDO` (con la que estaba activa pasando a `REEMPLAZADO`).

- [ ] **Step 7: Verificar el control de acceso**

Loguearse como AGRONOMO o PRODUCTOR: `/modelos-ia` no aparece en el sidebar; navegar directo a la URL redirige a `/403`; llamar `GET /api/v1/training/status` con esa sesión retorna 403.

- [ ] **Step 8: Restaurar `TRAINING_MIN_REVIEWED_ANALYSES`**

Revertir el valor de `TRAINING_MIN_REVIEWED_ANALYSES` en `fruit-backend/.env` a `50` (o el valor que el equipo decida para producción) y redesplegar:

```bash
docker compose up -d --build fruit-backend
```

- [ ] **Step 9: Documentar el resultado**

Si todo pasó, la feature está lista para PR. Si algo falló, anotar el error exacto (logs relevantes) antes de continuar — no marcar esta tarea como completa con fallas sin resolver.

---

## Self-Review

**Cobertura del spec:**
- §1 Arquitectura de servicios → Tasks 3, 4-11, 22-24.
- §2 Modelo de datos → Task 1.
- §3 Exportación de dataset → Tasks 8, 9, 20 (lógica de `resolveDetectionState`/`resolveClaseParaEntrenamiento` + endpoint).
- §4 Entrenamiento y validación (incl. timeout perezoso) → Tasks 10, 11, 17.
- §5 Sincronización de `CLASS_MAP` → Tasks 2, 4 (test de sincronización), 20 (`resolveClaseParaEntrenamiento`).
- §6 API de `fruit-backend` → Tasks 13-23.
- §7 Reinicio controlado de `fruit-inference` → Task 3, Task 24 (`restart: unless-stopped`).
- §8 UI de `zarza-web` → Tasks 25-27.
- §9 Manejo de errores → cubierto en cada servicio (401 en internos, 409/400 en `TrainingController`, mensajes de error en frontend vía `notification.error`).
- §10 Testing → cada tarea de código trae su test; Task 28 cubre el E2E manual.
- §11 Fuera de alcance → respetado (no se agregó cron, no se tocó `AGRONOMO`, no hay WebSocket de progreso, no hay taxonomía de enfermedades adicional).
- §12 Archivos a crear/modificar → todos los archivos listados están cubiertos por alguna tarea.

**Placeholders:** ninguno — cada step de código trae la implementación completa, no descripciones de "agregar validación" sin el código.

**Consistencia de tipos:** `TrainingCompleteDto`, `TrainingDatasetEntry`, `TrainingStatusResponse` (backend) y `TrainingStatus`/`ActiveModel`/etc. (frontend) usan los mismos nombres de campo en todas las tareas donde se referencian. `resolveClaseParaEntrenamiento` se define una sola vez (Task 16) y se consume igual en Task 20. `TRAINING_INTERNAL_TOKEN`/`x-training-token` se usan consistentemente en fruit-backend (Tasks 13, 23) y fruit-training (Tasks 5, 7, 11).
