# Image Preprocessing Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar preprocesado Gray World White Balance + CLAHE a `fruit-inference` para mejorar las predicciones del modelo YOLOv8 sin reentrenarlo.

**Architecture:** Se agrega `infrastructure/image_preprocessor.py` como único punto de preprocesado. `main.py` decodifica la imagen una sola vez a BGR, la pasa por el preprocesador, y usa el resultado tanto para la inferencia YOLO como para el cálculo de peso visual. `yolo_client.run_inference` se actualiza para aceptar un array BGR en lugar de bytes crudos.

**Tech Stack:** Python 3, OpenCV (`cv2`), NumPy, pytest — todos ya presentes en `requirements.txt`.

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `fruit-inference/tests/__init__.py` | Hace de `tests/` un paquete Python |
| Crear | `fruit-inference/tests/test_image_preprocessor.py` | Tests unitarios del preprocesador |
| Crear | `fruit-inference/infrastructure/image_preprocessor.py` | Gray World WB + CLAHE |
| Modificar | `fruit-inference/infrastructure/yolo_client.py` | `run_inference` acepta `np.ndarray` BGR |
| Modificar | `fruit-inference/main.py` | Flujo unificado + fallback + debug |
| Modificar | `fruit-inference/.env.example` | Nuevas variables de entorno |

---

## Task 1: Tests unitarios para `image_preprocessor` (TDD)

**Files:**
- Create: `fruit-inference/tests/__init__.py`
- Create: `fruit-inference/tests/test_image_preprocessor.py`

- [ ] **Step 1: Instalar pytest** (si no está disponible)

```bash
cd fruit-inference
pip install pytest
```

- [ ] **Step 2: Crear el paquete de tests**

Crear `fruit-inference/tests/__init__.py` vacío:

```python
```

- [ ] **Step 3: Escribir los tests**

Crear `fruit-inference/tests/test_image_preprocessor.py`:

```python
import cv2
import numpy as np
import pytest


def test_black_image_does_not_raise():
    """Gray World debe activar guardrail en imagen negra sin lanzar excepción."""
    from infrastructure.image_preprocessor import preprocess

    black = np.zeros((100, 100, 3), dtype=np.uint8)
    result, meta = preprocess(black, return_debug=True)

    assert result.shape == black.shape
    assert result.dtype == np.uint8
    assert meta["wb_applied"] is False
    assert meta["wb_skipped_reason"] == "low_mean_channel"
    assert meta["clahe_applied"] is True


def test_red_dominant_image_reduces_red_channel():
    """Gray World debe reducir el canal dominante rojo."""
    from infrastructure.image_preprocessor import preprocess

    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[:, :, 2] = 200  # Red (BGR index 2)
    img[:, :, 1] = 80   # Green
    img[:, :, 0] = 80   # Blue

    result, meta = preprocess(img, return_debug=True)

    assert meta["wb_applied"] is True
    assert result[:, :, 2].mean() < img[:, :, 2].mean()


def test_output_shape_and_dtype_preserved():
    """La imagen de salida debe tener el mismo shape y dtype que la entrada."""
    from infrastructure.image_preprocessor import preprocess

    img = np.random.randint(50, 200, (480, 640, 3), dtype=np.uint8)
    result = preprocess(img)

    assert result.shape == img.shape
    assert result.dtype == img.dtype


def test_clahe_does_not_alter_color_channels():
    """CLAHE solo debe modificar el canal L en espacio LAB, no a ni b."""
    from infrastructure.image_preprocessor import preprocess

    # Imagen con todos los canales iguales (Gray World es no-op: scale=1)
    img = np.full((100, 100, 3), 128, dtype=np.uint8)
    img[25:75, 25:75] = [60, 128, 128]  # variación en L, a y b equilibrados

    result, meta = preprocess(img, return_debug=True)

    assert meta["clahe_applied"] is True

    lab_before = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    lab_after  = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)

    # Canales a y b no deben cambiar
    np.testing.assert_array_equal(lab_before[:, :, 1], lab_after[:, :, 1])
    np.testing.assert_array_equal(lab_before[:, :, 2], lab_after[:, :, 2])
```

- [ ] **Step 4: Ejecutar los tests y verificar que FALLAN** (el módulo aún no existe)

```bash
cd fruit-inference
python -m pytest tests/test_image_preprocessor.py -v
```

Salida esperada: `ModuleNotFoundError: No module named 'infrastructure.image_preprocessor'`

- [ ] **Step 5: Commit**

```bash
git add fruit-inference/tests/
git commit -m "test(inference): add unit tests for image_preprocessor (red phase)"
```

---

## Task 2: Implementar `infrastructure/image_preprocessor.py`

**Files:**
- Create: `fruit-inference/infrastructure/image_preprocessor.py`

- [ ] **Step 1: Crear el módulo**

Crear `fruit-inference/infrastructure/image_preprocessor.py`:

```python
import os

import cv2
import numpy as np

_CLAHE_CLIP_LIMIT = float(os.getenv("CLAHE_CLIP_LIMIT", "2.0"))
_CLAHE_TILE_SIZE  = int(os.getenv("CLAHE_TILE_SIZE", "8"))


def preprocess(
    bgr_img: np.ndarray,
    return_debug: bool = False,
) -> "np.ndarray | tuple[np.ndarray, dict]":
    """
    Aplica Gray World White Balance + CLAHE a una imagen BGR de OpenCV.

    Args:
        bgr_img:      Array BGR uint8 de OpenCV.
        return_debug: Si True, retorna (imagen, metadata_dict).

    Returns:
        np.ndarray si return_debug=False.
        tuple[np.ndarray, dict] si return_debug=True.
        El dict tiene keys: wb_applied, wb_skipped_reason, clahe_applied.
    """
    meta = {"wb_applied": False, "wb_skipped_reason": None, "clahe_applied": False}

    img = _apply_gray_world(bgr_img, meta)
    img = _apply_clahe(img, meta)

    if return_debug:
        return img, meta
    return img


def _apply_gray_world(bgr_img: np.ndarray, meta: dict) -> np.ndarray:
    img_f = bgr_img.astype(np.float32)
    means = img_f.mean(axis=(0, 1))  # [mean_B, mean_G, mean_R]

    if (means < 1.0).any():
        meta["wb_skipped_reason"] = "low_mean_channel"
        return bgr_img

    global_mean = means.mean()
    scale       = global_mean / means
    corrected   = np.clip(img_f * scale, 0, 255).astype(np.uint8)
    meta["wb_applied"] = True
    return corrected


def _apply_clahe(bgr_img: np.ndarray, meta: dict) -> np.ndarray:
    lab        = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
    l, a, b    = cv2.split(lab)
    clahe      = cv2.createCLAHE(
        clipLimit=_CLAHE_CLIP_LIMIT,
        tileGridSize=(_CLAHE_TILE_SIZE, _CLAHE_TILE_SIZE),
    )
    l_eq       = clahe.apply(l)
    lab_eq     = cv2.merge([l_eq, a, b])
    meta["clahe_applied"] = True
    return cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)
```

- [ ] **Step 2: Ejecutar los tests y verificar que PASAN**

```bash
cd fruit-inference
python -m pytest tests/test_image_preprocessor.py -v
```

Salida esperada:
```
PASSED tests/test_image_preprocessor.py::test_black_image_does_not_raise
PASSED tests/test_image_preprocessor.py::test_red_dominant_image_reduces_red_channel
PASSED tests/test_image_preprocessor.py::test_output_shape_and_dtype_preserved
PASSED tests/test_image_preprocessor.py::test_clahe_does_not_alter_color_channels
4 passed
```

- [ ] **Step 3: Commit**

```bash
git add fruit-inference/infrastructure/image_preprocessor.py
git commit -m "feat(inference): add image_preprocessor with Gray World WB + CLAHE"
```

---

## Task 3: Actualizar `yolo_client.py` para aceptar BGR array

**Files:**
- Modify: `fruit-inference/infrastructure/yolo_client.py`

El cambio elimina la decodificación interna de bytes en `run_inference` y acepta directamente un `np.ndarray` BGR. YOLOv8 acepta arrays BGR de OpenCV nativamente en `model.predict`.

`bytes_to_bgr` se mantiene sin cambios — su uso se mueve a `main.py`.

- [ ] **Step 1: Reemplazar `run_inference` en `yolo_client.py`**

Reemplazar el contenido completo de `fruit-inference/infrastructure/yolo_client.py`:

```python
"""
fruit-inference — Infraestructura: cliente YOLO + helpers de conversión de imagen.

Responsabilidad: ejecutar el modelo YOLO sobre un array BGR y retornar
las detecciones en un formato neutral de dominio (list[dict]).
Sin dependencias de FastAPI ni boto3.
"""

import io

import cv2
import numpy as np
from PIL import Image


def bytes_to_bgr(image_bytes: bytes) -> np.ndarray:
    """Convierte bytes de imagen a array BGR de OpenCV."""
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def run_inference(
    model,
    bgr_img: np.ndarray,
    conf_threshold: float,
) -> list[dict]:
    """
    Ejecuta el modelo YOLO sobre un array BGR y retorna las detecciones.

    Args:
        model:          Instancia del modelo YOLO ya cargado.
        bgr_img:        Array BGR uint8 de OpenCV (ya preprocesado).
        conf_threshold: Umbral de confianza de detección.

    Returns:
        Lista de dicts con keys: class, confidence, bbox (x1, y1, x2, y2).
    """
    results = model.predict(source=bgr_img, conf=conf_threshold, verbose=False)

    detections = []
    for result in results:
        for box in result.boxes:
            class_id   = int(box.cls[0])
            class_name = result.names[class_id]
            confidence = float(box.conf[0])
            xyxy       = box.xyxy[0].cpu().numpy().astype(int)
            detections.append({
                "class":      class_name,
                "confidence": confidence,
                "bbox":       (int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])),
            })

    return detections
```

- [ ] **Step 2: Ejecutar los tests existentes para verificar que no hay regresiones**

```bash
cd fruit-inference
python -m pytest tests/ -v
```

Salida esperada: los 4 tests del Task 1 siguen en verde.

- [ ] **Step 3: Commit**

```bash
git add fruit-inference/infrastructure/yolo_client.py
git commit -m "refactor(inference): run_inference accepts BGR ndarray instead of raw bytes"
```

---

## Task 4: Actualizar `main.py` con flujo unificado

**Files:**
- Modify: `fruit-inference/main.py`

- [ ] **Step 1: Reemplazar el contenido de `main.py`**

```python
"""
fruit-inference — Entry point: app FastAPI + lifespan + endpoints.

Toda la lógica de negocio reside en:
  domain/weight.py    → cálculo de peso visual
  domain/analysis.py  → construcción del reporte fenológico
  infrastructure/r2_client.py         → descarga de imágenes desde R2
  infrastructure/yolo_client.py       → ejecución del modelo YOLO
  infrastructure/image_preprocessor.py → normalización de imagen

Este archivo sólo orquesta; no contiene lógica de dominio ni de infraestructura.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from ultralytics import YOLO

from infrastructure.r2_client import create_r2_client, download_image_bytes
from infrastructure.yolo_client import run_inference, bytes_to_bgr
from infrastructure.image_preprocessor import preprocess
from domain.analysis import build_report

load_dotenv()

MODEL_PATH          = os.getenv("MODEL_PATH", "model.pt")
R2_BUCKET           = os.getenv("R2_BUCKET_NAME", "")
CONF_THRESHOLD      = float(os.getenv("CONF_THRESHOLD", "0.25"))
PREPROCESSING_DEBUG = os.getenv("PREPROCESSING_DEBUG", "false").lower() == "true"

state: dict = {"model": None, "s3": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga el modelo YOLO y el cliente R2 una sola vez al arrancar."""
    print(f"[startup] Cargando modelo desde: {MODEL_PATH}")
    state["model"] = YOLO(MODEL_PATH)
    print("[startup] Modelo cargado correctamente.")

    state["s3"] = create_r2_client()
    print("[startup] Cliente R2 listo.")
    yield
    print("[shutdown] Servicio detenido.")


app = FastAPI(title="fruit-inference", lifespan=lifespan)


class AnalyzeRequest(BaseModel):
    storage_key: str
    image_id:    Optional[str] = None
    variedad:    Optional[str] = None


@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model_loaded": state["model"] is not None,
        "timestamp":    datetime.now(timezone.utc).isoformat(),
    }


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    if state["model"] is None:
        raise HTTPException(status_code=503, detail="Modelo aún no está cargado.")

    image_id = req.image_id or req.storage_key

    # 1. Descargar imagen desde R2
    image_bytes = download_image_bytes(state["s3"], R2_BUCKET, req.storage_key)

    # 2. Decodificar una sola vez a BGR
    bgr_img = bytes_to_bgr(image_bytes)

    # 3. Preprocesar (fallback a imagen original si algo falla)
    debug_meta = None
    try:
        if PREPROCESSING_DEBUG:
            bgr_preprocessed, debug_meta = preprocess(bgr_img, return_debug=True)
        else:
            bgr_preprocessed = preprocess(bgr_img)
    except Exception as e:
        print(f"[preprocess] warning: preprocesado falló, usando imagen original. {e}")
        bgr_preprocessed = bgr_img

    # 4. Inferencia YOLO
    detections = run_inference(state["model"], bgr_preprocessed, CONF_THRESHOLD)

    # 5. Construir reporte fenológico
    report = build_report(detections, bgr_preprocessed, image_id, req.variedad)

    if debug_meta is not None:
        report["debug_preprocessing"] = debug_meta

    return JSONResponse(content=report)
```

- [ ] **Step 2: Verificar que el servidor arranca sin errores** (requiere `.env` configurado con `MODEL_PATH` válido)

```bash
cd fruit-inference
uvicorn main:app --reload --port 8000
```

Salida esperada en consola:
```
[startup] Cargando modelo desde: best.pt
[startup] Modelo cargado correctamente.
[startup] Cliente R2 listo.
INFO: Application startup complete.
```

Si no tienes el modelo disponible, verificar al menos que el import no explota:

```bash
cd fruit-inference
python -c "from main import app; print('OK')"
```

Salida esperada: `OK`

- [ ] **Step 3: Ejecutar todos los tests**

```bash
cd fruit-inference
python -m pytest tests/ -v
```

Salida esperada: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add fruit-inference/main.py
git commit -m "feat(inference): unified decode→preprocess→infer pipeline in analyze endpoint"
```

---

## Task 5: Actualizar `.env.example`

**Files:**
- Modify: `fruit-inference/.env.example`

- [ ] **Step 1: Agregar las nuevas variables**

Reemplazar el contenido de `fruit-inference/.env.example`:

```dotenv
# Ruta al archivo .pt del modelo YOLO entrenado
MODEL_PATH=model.pt

# Umbral de confianza para detecciones (0.0 – 1.0)
CONF_THRESHOLD=0.25

# Cloudflare R2 — mismas credenciales que fruit-backend
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=fruit-images

# Preprocesado de imágenes
CLAHE_CLIP_LIMIT=2.0
CLAHE_TILE_SIZE=8
PREPROCESSING_DEBUG=false
```

- [ ] **Step 2: Commit final**

```bash
git add fruit-inference/.env.example
git commit -m "chore(inference): document new preprocessing env vars in .env.example"
```

---

## Validación manual post-deploy (no es código)

Una vez desplegado con imágenes reales problemáticas del campo:

1. Activar `PREPROCESSING_DEBUG=true` en el entorno
2. Llamar al endpoint `/analyze` con una imagen con contraluz o dominante de color fuerte
3. Revisar el campo `debug_preprocessing` en el response:
   ```json
   {
     "debug_preprocessing": {
       "wb_applied": true,
       "wb_skipped_reason": null,
       "clahe_applied": true
     }
   }
   ```
4. Si las detecciones no mejoran, ajustar `CLAHE_CLIP_LIMIT` (probar 1.5 o 3.0) y reintentar
5. Desactivar `PREPROCESSING_DEBUG=false` cuando se termine de calibrar
