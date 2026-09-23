# Detección de Daños (página provisional) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página solo-ADMIN en `zarza-web` donde se sube una foto de zarzamora y un segundo modelo (YOLOv8n-cls) la clasifica como sana, dañada o con alguna de 6 enfermedades.

**Architecture:** `fruit-inference` carga un segundo modelo opcional (`damage.pt`) y expone `POST /classify-damage` (multipart, token interno). `fruit-backend` añade `POST /api/v1/damage-classification` (ADMIN), que valida la imagen reutilizando el pipe y el validador de `ingestion/` y la reenvía a inferencia. `zarza-web` añade la página `/deteccion-danos`. Todo es síncrono y sin persistencia.

**Tech Stack:** FastAPI + Ultralytics + Pillow (pytest) · NestJS 11 + Fastify + `@nestjs/axios` (Jest) · React 18 + antd 5 + `@tanstack/react-query` + axios.

**Spec:** `docs/superpowers/specs/2026-09-22-deteccion-danos-design.md`

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `fruit-inference/infrastructure/damage_classifier.py` | Create | Cargar el modelo de daños (tolerante a fallos), decodificar la imagen (EXIF) y clasificar |
| `fruit-inference/tests/test_damage_classifier.py` | Create | Unit tests del clasificador |
| `fruit-inference/main.py` | Modify | Cargar el modelo en el lifespan, `/classify-damage` y `damage_model_loaded` en `/health` |
| `fruit-inference/tests/test_classify_damage.py` | Create | Tests del endpoint y del lifespan |
| `fruit-inference/requirements.txt` | Modify | `python-multipart` (lo requiere `UploadFile`) |
| `fruit-inference/.env.example`, `.dockerignore`, `README.md` | Modify | `DAMAGE_MODEL_PATH`, excluir `damage.pt` de la imagen, documentación |
| `docker-compose.yml` | Modify | Montar `damage.pt` como volumen `:ro` |
| `fruit-backend/src/damage-classification/damage-classification.types.ts` | Create | Tipo de respuesta |
| `fruit-backend/src/damage-classification/damage-classification.service.ts` (+ `.spec.ts`) | Create | Reenvío a inferencia y mapeo de errores |
| `fruit-backend/src/damage-classification/damage-classification.controller.ts` (+ `.spec.ts`) | Create | Endpoint ADMIN, parseo y validación de la imagen |
| `fruit-backend/src/damage-classification/damage-classification.module.ts` | Create | Módulo Nest |
| `fruit-backend/src/app.module.ts` | Modify | Registrar el módulo |
| `zarza-web/src/deteccion-danos/types.ts` | Create | `DamageClassificationResult` |
| `zarza-web/src/deteccion-danos/clases.ts` | Create | Clave → etiqueta y colores, formato de % |
| `zarza-web/src/deteccion-danos/useClasificarDano.ts` | Create | Mutation multipart y mensaje de error |
| `zarza-web/src/deteccion-danos/DeteccionDanosPage.tsx` | Create | La página |
| `zarza-web/src/App.tsx`, `zarza-web/src/shared/AppShell.tsx` | Modify | Ruta e item de menú |

---

### Task 0: Worktree y archivos locales

Todo el trabajo va en un worktree (regla global del usuario: nunca cambiar de rama en el directorio principal).

- [ ] **Step 1: Crear el worktree**

```bash
cd /home/san/Proyectos/zarza-workspace
git status --short   # debe estar limpio
git worktree add ../zarza-workspace-deteccion-danos -b feature/deteccion-danos
cd ../zarza-workspace-deteccion-danos
```

- [ ] **Step 2: Copiar los archivos ignorados por git que hacen falta para tests y E2E**

Los `.env` (gitignored) son necesarios: `fruit-backend/src/config/envs.ts` valida con Joi al importarse, así que sin `.env` fallan los specs de Jest. No imprimir su contenido.

```bash
W=/home/san/Proyectos/zarza-workspace
cp $W/fruit-backend/.env fruit-backend/.env
cp $W/fruit-ms/.env fruit-ms/.env
cp $W/fruit-inference/.env fruit-inference/.env
cp $W/packages/database/.env packages/database/.env 2>/dev/null || true
[ -f $W/fruit-training/.env ] && cp $W/fruit-training/.env fruit-training/.env
cp $W/fruit-inference/best.pt fruit-inference/best.pt
cp "/home/san/Descargas/modelo-dañadas/best.pt" fruit-inference/damage.pt
ln -s $W/fruit-inference/.venv fruit-inference/.venv
pnpm install --frozen-lockfile
pnpm --filter @rubus/database run generate   # cliente Prisma para jest/build del backend
(cd zarza-web && npm install)
git status --short   # debe seguir limpio
```

- [ ] **Step 3: Verificar la línea base**

```bash
(cd fruit-inference && .venv/bin/python -m pytest -q)   # Expected: 23 passed
(cd fruit-backend && pnpm exec jest 2>&1 | tail -5)     # Expected: todos pasan
```

---

### Task 1: `damage_classifier.py` (fruit-inference)

**Files:**
- Create: `fruit-inference/infrastructure/damage_classifier.py`
- Test: `fruit-inference/tests/test_damage_classifier.py`

- [ ] **Step 1: Escribir los tests (fallan)**

`fruit-inference/tests/test_damage_classifier.py`:

```python
import io
from types import SimpleNamespace
from unittest.mock import MagicMock

import numpy as np
import pytest
from PIL import Image

from infrastructure import damage_classifier
from infrastructure.damage_classifier import (
    DAMAGE_MODEL_INPUT_SIZE,
    InvalidImageError,
    classify,
    load_damage_model,
)

NAMES = {
    0: "antracnosis",
    1: "botrytis",
    2: "dano",
    3: "fusarium",
    4: "mildeo",
    5: "roya",
    6: "sano",
    7: "verticillium",
}


def _image_bytes(size=(20, 10), fmt="JPEG", mode="RGB", orientation=None):
    img = Image.new(mode, size)
    buf = io.BytesIO()
    if orientation is None:
        img.save(buf, fmt)
    else:
        exif = Image.Exif()
        exif[0x0112] = orientation
        img.save(buf, fmt, exif=exif)
    return buf.getvalue()


def _fake_model(scores):
    model = MagicMock()
    model.names = NAMES
    # En Ultralytics probs.data es un tensor de torch; numpy expone el mismo .tolist().
    model.predict.return_value = [
        SimpleNamespace(probs=SimpleNamespace(data=np.array(scores, dtype=np.float32)))
    ]
    return model


def test_classify_returns_top_class_and_all_probabilities_sorted():
    model = _fake_model([0.01, 0.80, 0.05, 0.02, 0.03, 0.04, 0.03, 0.02])

    result = classify(model, _image_bytes())

    assert result["clase"] == "botrytis"
    assert result["confianza"] == pytest.approx(0.8, abs=1e-4)
    confianzas = [p["confianza"] for p in result["probabilidades"]]
    assert confianzas == sorted(confianzas, reverse=True)
    assert {p["clase"] for p in result["probabilidades"]} == set(NAMES.values())
    assert result["probabilidades"][0] == {"clase": "botrytis", "confianza": result["confianza"]}


def test_classify_passes_rgb_pil_image_at_224():
    model = _fake_model([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0])

    classify(model, _image_bytes())

    args, kwargs = model.predict.call_args
    assert isinstance(args[0], Image.Image)
    assert args[0].mode == "RGB"
    assert kwargs["imgsz"] == DAMAGE_MODEL_INPUT_SIZE == 224
    assert kwargs["verbose"] is False


def test_classify_applies_exif_orientation():
    model = _fake_model([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0])

    # Orientación 6 = rotar 90°: una foto 20x10 guardada así se ve 10x20.
    classify(model, _image_bytes(size=(20, 10), orientation=6))

    img = model.predict.call_args.args[0]
    assert img.size == (10, 20)


def test_classify_converts_rgba_png_to_rgb():
    model = _fake_model([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0])

    classify(model, _image_bytes(fmt="PNG", mode="RGBA"))

    assert model.predict.call_args.args[0].mode == "RGB"


def test_classify_rejects_non_image_bytes_without_calling_model():
    model = _fake_model([1.0] + [0.0] * 7)

    with pytest.raises(InvalidImageError):
        classify(model, b"esto no es una imagen")

    model.predict.assert_not_called()


def test_load_returns_none_when_file_missing(tmp_path):
    assert load_damage_model(str(tmp_path / "no-existe.pt")) is None


def test_load_returns_none_when_yolo_fails(tmp_path, monkeypatch):
    path = tmp_path / "damage.pt"
    path.write_bytes(b"corrupto")
    monkeypatch.setattr(damage_classifier, "YOLO", MagicMock(side_effect=RuntimeError("bad file")))

    assert load_damage_model(str(path)) is None


def test_load_returns_none_when_model_is_not_classifier(tmp_path, monkeypatch):
    path = tmp_path / "damage.pt"
    path.write_bytes(b"x")
    monkeypatch.setattr(
        damage_classifier, "YOLO", MagicMock(return_value=MagicMock(task="detect", names=NAMES))
    )

    assert load_damage_model(str(path)) is None


def test_load_returns_model_when_classifier(tmp_path, monkeypatch):
    path = tmp_path / "damage.pt"
    path.write_bytes(b"x")
    model = MagicMock(task="classify", names=NAMES)
    monkeypatch.setattr(damage_classifier, "YOLO", MagicMock(return_value=model))

    assert load_damage_model(str(path)) is model
```

- [ ] **Step 2: Correrlos y verificar que fallan**

Run: `cd fruit-inference && .venv/bin/python -m pytest tests/test_damage_classifier.py -q`
Expected: FAIL/ERROR con `ModuleNotFoundError: No module named 'infrastructure.damage_classifier'`

- [ ] **Step 3: Implementar**

`fruit-inference/infrastructure/damage_classifier.py`:

```python
"""
fruit-inference — Infraestructura: clasificador de fruta enferma/dañada.

Responsabilidad: cargar el modelo YOLOv8-cls de daños (opcional) y clasificar
una imagen completa en una de sus clases (sano, dano, botrytis, ...).

A diferencia del detector fenológico (yolo_client.py) aquí NO se estira la
imagen a 640: el modelo se entrenó con imgsz=224 y el preprocesamiento de
clasificación por defecto de Ultralytics, que es el que aplica predict().
Sin dependencias de FastAPI.
"""

import io
import os

from PIL import Image, ImageOps
from ultralytics import YOLO

from infrastructure.logger import AppLogger

DAMAGE_MODEL_INPUT_SIZE = 224

_logger = AppLogger()


class InvalidImageError(ValueError):
    """Los bytes recibidos no son una imagen decodificable."""


def load_damage_model(path: str):
    """
    Carga el modelo de daños. Devuelve None (con warning) si el archivo no
    existe, no se puede cargar o no es un modelo de clasificación: el
    servicio debe seguir arrancando para no afectar a /analyze.
    """
    if not os.path.isfile(path):
        _logger.warn(
            "Modelo de daños no encontrado; /classify-damage responderá 503",
            modelPath=path,
        )
        return None
    try:
        model = YOLO(path)
    except Exception as e:
        _logger.warn("No se pudo cargar el modelo de daños", modelPath=path, error=str(e))
        return None
    if model.task != "classify":
        _logger.warn(
            "El modelo de daños no es de clasificación", modelPath=path, modelTask=model.task
        )
        return None
    _logger.info("Modelo de daños cargado", modelPath=path, clases=list(model.names.values()))
    return model


def decode_image(image_bytes: bytes) -> Image.Image:
    """Decodifica los bytes, corrige la orientación EXIF (fotos de celular) y convierte a RGB."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.load()
        img = ImageOps.exif_transpose(img)
        return img.convert("RGB")
    except Exception as e:
        raise InvalidImageError("Imagen inválida") from e


def classify(model, image_bytes: bytes) -> dict:
    """
    Clasifica la imagen y devuelve la clase más probable junto con la
    probabilidad de todas las clases, ordenadas de mayor a menor.
    """
    img = decode_image(image_bytes)
    results = model.predict(img, imgsz=DAMAGE_MODEL_INPUT_SIZE, verbose=False)
    scores = [float(s) for s in results[0].probs.data.tolist()]
    ranking = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    probabilidades = [
        {"clase": model.names[i], "confianza": round(scores[i], 4)} for i in ranking
    ]
    return {
        "clase": probabilidades[0]["clase"],
        "confianza": probabilidades[0]["confianza"],
        "probabilidades": probabilidades,
    }
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `.venv/bin/python -m pytest tests/test_damage_classifier.py -q`
Expected: `9 passed`

- [ ] **Step 5: Smoke test con el modelo real (sin commitear nada)**

```bash
.venv/bin/python -c "
import io
from PIL import Image
from infrastructure.damage_classifier import load_damage_model, classify
m = load_damage_model('damage.pt'); assert m is not None
buf = io.BytesIO(); Image.new('RGB', (640, 480), (60, 20, 40)).save(buf, 'JPEG')
r = classify(m, buf.getvalue()); print(r['clase'], r['confianza'], len(r['probabilidades']))
"
```
Expected: una clase cualquiera, una confianza entre 0 y 1, y `8`.

- [ ] **Step 6: Commit**

```bash
git add fruit-inference/infrastructure/damage_classifier.py fruit-inference/tests/test_damage_classifier.py
git commit -m "feat(fruit-inference): agregar clasificador de fruta enferma/dañada"
```

---

### Task 2: Endpoint `/classify-damage` y lifespan (fruit-inference)

**Files:**
- Modify: `fruit-inference/main.py`
- Modify: `fruit-inference/requirements.txt`
- Test: `fruit-inference/tests/test_classify_damage.py`

- [ ] **Step 1: Agregar la dependencia e instalarla**

Agregar al final de `fruit-inference/requirements.txt`:

```
python-multipart>=0.0.9
```

Run: `.venv/bin/pip install "python-multipart>=0.0.9"`
Expected: se instala sin errores (FastAPI lo exige para `UploadFile`/`File`).

- [ ] **Step 2: Escribir los tests (fallan)**

`fruit-inference/tests/test_classify_damage.py`:

```python
"""
Tests de POST /classify-damage y de la carga del modelo de daños en el
lifespan. Igual que test_main.py, se usa TestClient sin `with` (no dispara el
lifespan) salvo en el test que verifica justamente el lifespan.
"""

import importlib
import io
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from PIL import Image

RESULT = {
    "clase": "botrytis",
    "confianza": 0.9,
    "probabilidades": [{"clase": "botrytis", "confianza": 0.9}],
}


def _jpeg_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (8, 8)).save(buf, "JPEG")
    return buf.getvalue()


def _reload_main(monkeypatch, bypass_auth=True, **env):
    monkeypatch.setenv("INFERENCE_AUTH_TOKEN", "test-token")
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    # infrastructure.auth lee el token a nivel de módulo y otro test puede
    # haberlo recargado con otro valor; se recarga antes que main.
    from infrastructure import auth as auth_module
    importlib.reload(auth_module)

    import main as main_module
    importlib.reload(main_module)
    if bypass_auth:
        main_module.app.dependency_overrides[main_module.verify_inference_token] = lambda: None
    return main_module


def _post(main_module, content, headers=None):
    client = TestClient(main_module.app)
    return client.post(
        "/classify-damage",
        files={"file": ("foto.jpg", content, "image/jpeg")},
        headers=headers or {},
    )


def test_returns_classification(monkeypatch):
    main_module = _reload_main(monkeypatch)
    model = MagicMock()
    main_module.state["damage_model"] = model
    classify_mock = MagicMock(return_value=RESULT)
    monkeypatch.setattr(main_module, "classify", classify_mock)
    content = _jpeg_bytes()

    response = _post(main_module, content)

    assert response.status_code == 200
    assert response.json() == RESULT
    classify_mock.assert_called_once_with(model, content)


def test_returns_503_when_model_not_loaded(monkeypatch):
    main_module = _reload_main(monkeypatch)
    main_module.state["damage_model"] = None

    response = _post(main_module, _jpeg_bytes())

    assert response.status_code == 503
    assert response.json()["detail"] == "Modelo de clasificación de daños no disponible"


def test_returns_400_for_invalid_image(monkeypatch):
    main_module = _reload_main(monkeypatch)
    main_module.state["damage_model"] = MagicMock()

    response = _post(main_module, b"no soy una imagen")

    assert response.status_code == 400
    assert response.json()["detail"] == "Imagen inválida"


def test_returns_413_when_image_too_large(monkeypatch):
    main_module = _reload_main(monkeypatch, MAX_IMAGE_SIZE_MB="1")
    main_module.state["damage_model"] = MagicMock()
    classify_mock = MagicMock(return_value=RESULT)
    monkeypatch.setattr(main_module, "classify", classify_mock)

    response = _post(main_module, b"\xff" * 1_000_001)

    assert response.status_code == 413
    classify_mock.assert_not_called()


def test_rejects_invalid_token(monkeypatch):
    main_module = _reload_main(monkeypatch, bypass_auth=False)
    main_module.state["damage_model"] = MagicMock()

    response = _post(main_module, _jpeg_bytes(), headers={"x-inference-token": "wrong"})

    assert response.status_code == 401


def test_lifespan_loads_damage_model_and_health_reports_it(monkeypatch):
    main_module = _reload_main(monkeypatch, DAMAGE_MODEL_PATH="custom-damage.pt")
    sentinel = MagicMock()
    load_mock = MagicMock(return_value=sentinel)
    monkeypatch.setattr(main_module, "YOLO", MagicMock())
    monkeypatch.setattr(main_module, "create_r2_client", MagicMock())
    monkeypatch.setattr(main_module, "load_damage_model", load_mock)

    with TestClient(main_module.app) as client:
        assert main_module.state["damage_model"] is sentinel
        assert client.get("/health").json()["damage_model_loaded"] is True

    load_mock.assert_called_once_with("custom-damage.pt")
```

- [ ] **Step 3: Correrlos y verificar que fallan**

Run: `.venv/bin/python -m pytest tests/test_classify_damage.py -q`
Expected: FAIL. Los endpoints responden 404, y el test del lifespan falla con `AttributeError: ... has no attribute 'load_damage_model'`.

- [ ] **Step 4: Implementar en `main.py`**

4a. En el docstring del módulo, agregar esta línea a la lista de infraestructura (después de `infrastructure/image_preprocessor.py`):

```
  infrastructure/damage_classifier.py  → modelo de fruta enferma/dañada
```

4b. Cambiar la importación de FastAPI:

```python
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, UploadFile
```

4c. Después de `from infrastructure.image_preprocessor import preprocess`, agregar:

```python
from infrastructure.damage_classifier import InvalidImageError, classify, load_damage_model
```

4d. Después de la línea `MAX_IMAGE_SIZE_BYTES = ...`, agregar:

```python
DAMAGE_MODEL_PATH   = os.getenv("DAMAGE_MODEL_PATH", "damage.pt")
```

y cambiar la línea de `state`:

```python
state: dict = {"model": None, "s3": None, "damage_model": None}
```

4e. En `lifespan`, justo después de `startup_logger.info("Modelo YOLO cargado")`, agregar:

```python

    # Opcional: si falta o falla, load_damage_model devuelve None y solo
    # /classify-damage responde 503 — /analyze sigue funcionando.
    state["damage_model"] = load_damage_model(DAMAGE_MODEL_PATH)
```

4f. En `health()`, agregar la clave después de `"model_loaded"`:

```python
        "damage_model_loaded": state["damage_model"] is not None,
```

4g. Agregar el endpoint después de `analyze` y antes de `prepare_restart`:

```python
@app.post("/classify-damage", dependencies=[Depends(verify_inference_token)])
def classify_damage(request: Request, file: UploadFile = File(...)):
    """Clasifica una foto (multipart `file`) como sana, dañada o enferma."""
    logger = AppLogger(request.headers.get("x-trace-id"))

    if state["damage_model"] is None:
        raise HTTPException(
            status_code=503, detail="Modelo de clasificación de daños no disponible"
        )

    # Se lee como máximo un byte más del límite: basta para saber si lo excede
    # sin cargar en memoria un archivo arbitrariamente grande.
    image_bytes = file.file.read(MAX_IMAGE_SIZE_BYTES + 1)
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande")

    try:
        result = classify(state["damage_model"], image_bytes)
    except InvalidImageError:
        raise HTTPException(status_code=400, detail="Imagen inválida")

    logger.info(
        "Clasificación de daños completada",
        clase=result["clase"],
        confianza=result["confianza"],
    )
    return result
```

- [ ] **Step 5: Correr toda la suite**

Run: `.venv/bin/python -m pytest -q`
Expected: `38 passed` (23 previos + 9 + 6).

- [ ] **Step 6: Commit**

```bash
git add fruit-inference/main.py fruit-inference/requirements.txt fruit-inference/tests/test_classify_damage.py
git commit -m "feat(fruit-inference): exponer POST /classify-damage con modelo de daños opcional"
```

---

### Task 3: Docker, env y documentación de fruit-inference

**Files:**
- Modify: `docker-compose.yml` (servicio `fruit-inference`, bloque `volumes`)
- Modify: `fruit-inference/.dockerignore`, `fruit-inference/.env.example`, `fruit-inference/README.md`

- [ ] **Step 1: Montar el modelo en compose**

En `docker-compose.yml`, servicio `fruit-inference`, reemplazar el bloque `volumes`:

```yaml
    volumes:
      # Monta el modelo .pt desde la carpeta fruit-inference sin incluirlo en la imagen
      - ./fruit-inference/best.pt:/app/model.pt:ro
      # Modelo de clasificación de fruta enferma/dañada (opcional: si falta,
      # solo /classify-damage responde 503). DAMAGE_MODEL_PATH default = damage.pt → /app/damage.pt
      - ./fruit-inference/damage.pt:/app/damage.pt:ro
```

- [ ] **Step 2: Excluir el modelo de la imagen Docker**

Agregar al final de `fruit-inference/.dockerignore`:

```
damage.pt
```

- [ ] **Step 3: Documentar la env**

Agregar a `fruit-inference/.env.example`, justo después de la línea `MODEL_PATH=model.pt`:

```
# Ruta al modelo YOLOv8-cls de fruta enferma/dañada (POST /classify-damage).
# Opcional: si el archivo no existe el servicio arranca igual y ese endpoint
# responde 503.
DAMAGE_MODEL_PATH=damage.pt
```

- [ ] **Step 4: README**

En `fruit-inference/README.md`, justo después del párrafo que termina en "Puerto `8000`, expuesto solo en `127.0.0.1`." (sección Docker, ~línea 89), agregar:

```markdown

### Modelo de fruta enferma/dañada (`damage.pt`)

Segundo modelo, **opcional**, de clasificación (YOLOv8n-cls, `imgsz=224`, clases `antracnosis`, `botrytis`, `dano`, `fusarium`, `mildeo`, `roya`, `sano`, `verticillium`). Lo consume `POST /classify-damage` (multipart `file`, header `x-inference-token`), que usa la página provisional "Detección de Daños (beta)" de `zarza-web` a través de `fruit-backend`. Como `best.pt`, está en `.gitignore` y se monta como volumen (`./fruit-inference/damage.pt:/app/damage.pt:ro`): hay que copiarlo a `fruit-inference/damage.pt` antes de `docker compose up`. Si falta, el servicio arranca igual, `/health` reporta `damage_model_loaded: false` y solo ese endpoint responde 503. Ojo: si el archivo no existe al levantar compose, Docker crea en su lugar un **directorio** vacío `damage.pt`; bórralo antes de copiar el modelo real.
```

- [ ] **Step 5: Validar compose**

Run: `docker compose config --quiet && echo OK`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml fruit-inference/.dockerignore fruit-inference/.env.example fruit-inference/README.md
git commit -m "chore(fruit-inference): montar damage.pt y documentar DAMAGE_MODEL_PATH"
```

---

### Task 4: `DamageClassificationService` (fruit-backend)

**Files:**
- Create: `fruit-backend/src/damage-classification/damage-classification.types.ts`
- Create: `fruit-backend/src/damage-classification/damage-classification.service.ts`
- Test: `fruit-backend/src/damage-classification/damage-classification.service.spec.ts`

- [ ] **Step 1: Crear el tipo**

`fruit-backend/src/damage-classification/damage-classification.types.ts`:

```ts
export interface DamageClassProbability {
  clase: string;
  confianza: number;
}

/** Respuesta de fruit-inference POST /classify-damage, devuelta tal cual al cliente. */
export interface DamageClassificationResult {
  clase: string;
  confianza: number;
  probabilidades: DamageClassProbability[];
}
```

- [ ] **Step 2: Escribir el spec (falla)**

`fruit-backend/src/damage-classification/damage-classification.service.spec.ts`:

```ts
import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { HttpService } from '@nestjs/axios';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import type { AppLogger } from '../common/logging/app.logger';
import { envs } from '../config/envs';
import { DamageClassificationService } from './damage-classification.service';

function axiosErrorWithStatus(status: number, data: unknown): AxiosError {
  return new AxiosError('request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);
}

describe('DamageClassificationService', () => {
  let httpService: { post: jest.Mock };
  let logger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };
  let service: DamageClassificationService;
  const image = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  beforeEach(() => {
    httpService = { post: jest.fn() };
    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    service = new DamageClassificationService(
      httpService as unknown as HttpService,
      logger as unknown as AppLogger,
    );
  });

  it('reenvía la imagen como multipart con el token interno y devuelve el resultado', async () => {
    const result = {
      clase: 'sano',
      confianza: 0.97,
      probabilidades: [{ clase: 'sano', confianza: 0.97 }],
    };
    httpService.post.mockReturnValue(of({ data: result }));

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).resolves.toEqual(result);

    const [url, body, config] = httpService.post.mock.calls[0];
    expect(url).toBe(`${envs.inferenceUrl}/classify-damage`);
    expect(config).toEqual(
      expect.objectContaining({
        headers: { 'x-inference-token': envs.inferenceAuthToken },
        timeout: 30_000,
      }),
    );
    expect(body).toBeInstanceOf(FormData);
    const file = (body as FormData).get('file') as File;
    expect(file.name).toBe('foto.jpg');
    expect(file.type).toBe('image/jpeg');
    expect(Buffer.from(await file.arrayBuffer())).toEqual(image);
  });

  it('mapea un 400 de inferencia a BadRequest con su detail', async () => {
    httpService.post.mockReturnValue(
      throwError(() => axiosErrorWithStatus(400, { detail: 'Imagen inválida' })),
    );

    const promise = service.classify(image, 'foto.jpg', 'image/jpeg');

    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toThrow('Imagen inválida');
  });

  it('mapea un 413 de inferencia a BadRequest', async () => {
    httpService.post.mockReturnValue(
      throwError(() => axiosErrorWithStatus(413, { detail: 'Imagen demasiado grande' })),
    );

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toThrow(
      new BadRequestException('Imagen demasiado grande'),
    );
  });

  it('mapea un 503 de inferencia (modelo no cargado) a ServiceUnavailable', async () => {
    httpService.post.mockReturnValue(
      throwError(() => axiosErrorWithStatus(503, { detail: 'Modelo no disponible' })),
    );

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toThrow(
      new ServiceUnavailableException('Servicio de clasificación no disponible'),
    );
  });

  it('mapea conexión rechazada (sin response) a ServiceUnavailable', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED')),
    );

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('mapea timeout a ServiceUnavailable', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new AxiosError('timeout of 30000ms exceeded', 'ECONNABORTED')),
    );

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('mapea cualquier otro error a BadGateway y lo registra', async () => {
    httpService.post.mockReturnValue(throwError(() => axiosErrorWithStatus(500, {})));

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(logger.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Correrlo y verificar que falla**

Run: `cd fruit-backend && pnpm exec jest src/damage-classification/damage-classification.service.spec.ts`
Expected: FAIL con `Cannot find module './damage-classification.service'`

- [ ] **Step 4: Implementar**

`fruit-backend/src/damage-classification/damage-classification.service.ts`:

```ts
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { envs } from '../config/envs';
import { AppLogger } from '../common/logging/app.logger';
import type { DamageClassificationResult } from './damage-classification.types';

const INFERENCE_TIMEOUT_MS = 30_000;

@Injectable()
export class DamageClassificationService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: AppLogger,
  ) {}

  /** Reenvía la imagen ya validada a fruit-inference y devuelve su clasificación. */
  async classify(
    image: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<DamageClassificationResult> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(image)], { type: mimetype }), filename);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DamageClassificationResult>(
          `${envs.inferenceUrl}/classify-damage`,
          form,
          {
            headers: { 'x-inference-token': envs.inferenceAuthToken },
            timeout: INFERENCE_TIMEOUT_MS,
          },
        ),
      );
      return data;
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 400 || status === 413) {
        const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
        return new BadRequestException(typeof detail === 'string' ? detail : 'Imagen inválida');
      }
      // Sin response = conexión rechazada o timeout; 503 = modelo no cargado.
      if (status === 503 || !error.response) {
        this.logger.warn('Servicio de clasificación de daños no disponible', {
          code: error.code,
          status,
        });
        return new ServiceUnavailableException('Servicio de clasificación no disponible');
      }
    }
    this.logger.error('Error inesperado al clasificar daños', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new BadGatewayException('Error al clasificar la imagen');
  }
}
```

- [ ] **Step 5: Correr el spec y verificar que pasa**

Run: `pnpm exec jest src/damage-classification/damage-classification.service.spec.ts`
Expected: `7 passed`

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/damage-classification/
git commit -m "feat(fruit-backend): agregar servicio proxy de clasificación de daños"
```

---

### Task 5: Controller, módulo y registro (fruit-backend)

**Files:**
- Create: `fruit-backend/src/damage-classification/damage-classification.controller.ts`
- Create: `fruit-backend/src/damage-classification/damage-classification.module.ts`
- Modify: `fruit-backend/src/app.module.ts`
- Test: `fruit-backend/src/damage-classification/damage-classification.controller.spec.ts`

- [ ] **Step 1: Escribir el spec (falla)**

`fruit-backend/src/damage-classification/damage-classification.controller.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import type { FastifyRequest } from 'fastify';
import { DamageClassificationController } from './damage-classification.controller';
import type { DamageClassificationService } from './damage-classification.service';
import type { MultipartImagePipe } from '../ingestion/pipes/multipart-image.pipe';
import type { MagicNumberValidator } from '../ingestion/validators/magic-number.validator';

describe('DamageClassificationController', () => {
  let service: { classify: jest.Mock };
  let pipe: { transform: jest.Mock };
  let validator: { readAndValidate: jest.Mock };
  let controller: DamageClassificationController;
  const req = {} as FastifyRequest;
  const stream = Readable.from(Buffer.from('x'));
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  beforeEach(() => {
    service = { classify: jest.fn() };
    pipe = { transform: jest.fn() };
    validator = { readAndValidate: jest.fn() };
    controller = new DamageClassificationController(
      service as unknown as DamageClassificationService,
      pipe as unknown as MultipartImagePipe,
      validator as unknown as MagicNumberValidator,
    );
    pipe.transform.mockResolvedValue({ file: stream, filename: 'foto.jpg', mimetype: 'image/jpeg' });
  });

  it('parsea el multipart, valida la imagen y delega en el service', async () => {
    const result = { clase: 'sano', confianza: 0.9, probabilidades: [] };
    validator.readAndValidate.mockResolvedValue(buffer);
    service.classify.mockResolvedValue(result);

    await expect(controller.classify(req)).resolves.toEqual(result);

    expect(pipe.transform).toHaveBeenCalledWith(req);
    expect(validator.readAndValidate).toHaveBeenCalledWith(stream, 'image/jpeg');
    expect(service.classify).toHaveBeenCalledWith(buffer, 'foto.jpg', 'image/jpeg');
  });

  it('no llama al service si la imagen no pasa la validación', async () => {
    validator.readAndValidate.mockRejectedValue(
      new BadRequestException('Invalid file type. Only JPG and PNG are allowed.'),
    );

    await expect(controller.classify(req)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.classify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correrlo y verificar que falla**

Run: `pnpm exec jest src/damage-classification/damage-classification.controller.spec.ts`
Expected: FAIL con `Cannot find module './damage-classification.controller'`

- [ ] **Step 3: Implementar el controller**

`fruit-backend/src/damage-classification/damage-classification.controller.ts`:

```ts
import { Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { MultipartImagePipe } from '../ingestion/pipes/multipart-image.pipe';
import { MagicNumberValidator } from '../ingestion/validators/magic-number.validator';
import { DamageClassificationService } from './damage-classification.service';
import type { DamageClassificationResult } from './damage-classification.types';

@ApiTags('Damage Classification')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@Controller('damage-classification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DamageClassificationController {
  constructor(
    private readonly damageClassificationService: DamageClassificationService,
    private readonly pipe: MultipartImagePipe,
    private readonly validator: MagicNumberValidator,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Clasificar fruta enferma o dañada (provisional)',
    description:
      'Clasifica una foto con el modelo de daños de fruit-inference. No persiste nada.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Foto JPG o PNG (máx. 5 MB).' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Clase más probable y probabilidades de todas.' })
  @ApiResponse({ status: 400, description: 'Archivo ausente o imagen inválida.' })
  @ApiResponse({ status: 403, description: 'Solo ADMIN puede acceder.' })
  @ApiResponse({ status: 503, description: 'Servicio o modelo de clasificación no disponible.' })
  async classify(@Req() req: FastifyRequest): Promise<DamageClassificationResult> {
    const { file, filename, mimetype } = await this.pipe.transform(req);
    const image = await this.validator.readAndValidate(file, mimetype);
    return this.damageClassificationService.classify(image, filename, mimetype);
  }
}
```

- [ ] **Step 4: Crear el módulo y registrarlo**

`fruit-backend/src/damage-classification/damage-classification.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { MultipartImagePipe } from '../ingestion/pipes/multipart-image.pipe';
import { MagicNumberValidator } from '../ingestion/validators/magic-number.validator';
import { DamageClassificationController } from './damage-classification.controller';
import { DamageClassificationService } from './damage-classification.service';

@Module({
  imports: [AuthModule, HttpModule],
  controllers: [DamageClassificationController],
  providers: [DamageClassificationService, MultipartImagePipe, MagicNumberValidator],
})
export class DamageClassificationModule {}
```

En `fruit-backend/src/app.module.ts`, agregar el import después de `import { TrainingModule } from './training/training.module';`:

```ts
import { DamageClassificationModule } from './damage-classification/damage-classification.module';
```

y en el array `imports` del `@Module`, justo después de `TrainingModule,`:

```ts
    DamageClassificationModule,
```

- [ ] **Step 5: Verificar (las tres cosas, ver gotchas del repo)**

```bash
pnpm exec jest src/damage-classification   # Expected: 9 passed
pnpm exec jest 2>&1 | tail -5              # Expected: toda la suite pasa
pnpm run build                             # Expected: sin errores
npx tsc --noEmit 2>&1 | grep -c "error TS" # Expected: 8 (línea base preexistente: fcm.service.spec, internal-notify.controller.spec x6, storage.service.spec); ninguno en damage-classification/
npx eslint "src/damage-classification/**/*.ts" src/app.module.ts   # Expected: sin errores
```

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/damage-classification/ fruit-backend/src/app.module.ts
git commit -m "feat(fruit-backend): exponer POST /damage-classification solo para ADMIN"
```

---

### Task 6: Tipos, clases y hook (zarza-web)

**Files:**
- Create: `zarza-web/src/deteccion-danos/types.ts`
- Create: `zarza-web/src/deteccion-danos/clases.ts`
- Create: `zarza-web/src/deteccion-danos/useClasificarDano.ts`

`zarza-web` no tiene framework de tests; la verificación es `npm run build` (`tsc -b` + vite), más el E2E de la Task 8.

- [ ] **Step 1: Tipos**

`zarza-web/src/deteccion-danos/types.ts`:

```ts
export interface DamageClassProbability {
  clase: string;
  confianza: number;
}

export interface DamageClassificationResult {
  clase: string;
  confianza: number;
  probabilidades: DamageClassProbability[];
}
```

- [ ] **Step 2: Mapa de clases**

`zarza-web/src/deteccion-danos/clases.ts`:

```ts
import { lightTheme } from '../shared/lightTheme';

export interface InfoClase {
  etiqueta: string;
  /** Color preset de antd <Tag>. */
  tagColor: 'success' | 'warning' | 'error' | 'default';
  /** Color de la barra <Progress>. */
  barColor: string;
}

const SANO = { tagColor: 'success', barColor: lightTheme.emerald } as const;
const DANO = { tagColor: 'warning', barColor: lightTheme.warn } as const;
const ENFERMEDAD = { tagColor: 'error', barColor: lightTheme.danger } as const;

const CLASES: Record<string, InfoClase> = {
  sano: { etiqueta: 'Sano', ...SANO },
  dano: { etiqueta: 'Daño', ...DANO },
  antracnosis: { etiqueta: 'Antracnosis', ...ENFERMEDAD },
  botrytis: { etiqueta: 'Botrytis', ...ENFERMEDAD },
  fusarium: { etiqueta: 'Fusarium', ...ENFERMEDAD },
  mildeo: { etiqueta: 'Mildiú', ...ENFERMEDAD },
  roya: { etiqueta: 'Roya', ...ENFERMEDAD },
  verticillium: { etiqueta: 'Verticilosis', ...ENFERMEDAD },
};

/** Una clase desconocida (p.ej. si se cambia el modelo) se muestra cruda y en gris. */
export function infoClase(clase: string): InfoClase {
  return CLASES[clase] ?? { etiqueta: clase, tagColor: 'default', barColor: lightTheme.gray };
}

export function formatearConfianza(confianza: number): string {
  return `${(confianza * 100).toFixed(1)}%`;
}
```

- [ ] **Step 3: Hook**

`zarza-web/src/deteccion-danos/useClasificarDano.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { DamageClassificationResult } from './types';

export function useClasificarDano() {
  return useMutation({
    mutationFn: (foto: File) => {
      const form = new FormData();
      form.append('file', foto);
      // apiClient trae Content-Type: application/json por defecto; con ese
      // header axios serializaría el FormData a JSON. multipart/form-data hace
      // que lo envíe tal cual y que el navegador ponga el boundary.
      return apiClient
        .post<DamageClassificationResult>('/damage-classification', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60_000,
        })
        .then((r) => r.data);
    },
  });
}

export function mensajeDeErrorClasificacion(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { message?: unknown } } })
    ?.response;
  if (response?.status === 413) return 'La imagen supera el límite de 5 MB.';
  const message = response?.data?.message;
  if (typeof message === 'string' && message) return message;
  if (Array.isArray(message) && message.length) return message.join(', ');
  if (!response) return 'No se pudo conectar con el servidor. Intenta de nuevo.';
  return 'No se pudo analizar la imagen. Intenta de nuevo.';
}
```

- [ ] **Step 4: Verificar que compila**

Run: `cd zarza-web && npm run build`
Expected: build exitoso, sin errores de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add zarza-web/src/deteccion-danos/
git commit -m "feat(zarza-web): agregar tipos, clases y hook de clasificación de daños"
```

---

### Task 7: Página, ruta y menú (zarza-web)

**Files:**
- Create: `zarza-web/src/deteccion-danos/DeteccionDanosPage.tsx`
- Modify: `zarza-web/src/App.tsx`
- Modify: `zarza-web/src/shared/AppShell.tsx` (constante `GROUP_ADMIN`)

- [ ] **Step 1: La página**

`zarza-web/src/deteccion-danos/DeteccionDanosPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Progress, Space, Tag, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { mensajeDeErrorClasificacion, useClasificarDano } from './useClasificarDano';
import { formatearConfianza, infoClase } from './clases';

const { Title, Text, Paragraph } = Typography;

// Mismos límites que fruit-backend (@fastify/multipart fileSize 5 MB y
// MagicNumberValidator: solo JPG/PNG).
const MAX_BYTES = 5_000_000;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png'];

const CARD_STYLE = { flex: '1 1 320px', maxWidth: 520 } as const;

export function DeteccionDanosPage() {
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const clasificar = useClasificarDano();

  useEffect(() => {
    if (!foto) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  // Solo se muestra lo que corresponde a la foto actual: evita que la
  // respuesta de una foto anterior aparezca sobre una recién elegida.
  const esDeFotoActual = clasificar.variables === foto;
  const resultado = esDeFotoActual ? clasificar.data : undefined;
  const error = esDeFotoActual && clasificar.isError ? clasificar.error : null;
  const principal = resultado ? infoClase(resultado.clase) : null;

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      message.error('Solo se permiten imágenes JPG o PNG.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_BYTES) {
      message.error('La imagen supera el límite de 5 MB.');
      return Upload.LIST_IGNORE;
    }
    clasificar.reset();
    setFoto(file);
    return false; // no subir automáticamente: se envía al pulsar "Analizar"
  };

  function reiniciar() {
    clasificar.reset();
    setFoto(null);
  }

  return (
    <div>
      <Title level={3}>
        Detección de Daños <Tag color="gold">beta</Tag>
      </Title>
      <Paragraph type="secondary">
        Sube una foto de una zarzamora para saber si está sana, dañada o presenta alguna
        enfermedad. Los resultados no se guardan.
      </Paragraph>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <Card style={CARD_STYLE}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Foto seleccionada"
              style={{
                display: 'block',
                width: '100%',
                maxHeight: 420,
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
          ) : (
            <Upload.Dragger
              accept={TIPOS_PERMITIDOS.join(',')}
              multiple={false}
              showUploadList={false}
              beforeUpload={beforeUpload}
            >
              <p style={{ fontSize: 16, margin: '24px 0 8px' }}>
                Haz clic o arrastra una foto aquí
              </p>
              <Text type="secondary">JPG o PNG, máximo 5 MB</Text>
              <div style={{ height: 24 }} />
            </Upload.Dragger>
          )}

          {foto && (
            <Space wrap style={{ marginTop: 16 }}>
              {!resultado && (
                <Button
                  type="primary"
                  loading={clasificar.isPending}
                  onClick={() => clasificar.mutate(foto)}
                >
                  Analizar
                </Button>
              )}
              <Button onClick={reiniciar} disabled={clasificar.isPending}>
                {resultado ? 'Analizar otra foto' : 'Cambiar foto'}
              </Button>
            </Space>
          )}

          {error && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 16 }}
              message={mensajeDeErrorClasificacion(error)}
            />
          )}
        </Card>

        {resultado && principal && (
          <Card title="Resultado" style={CARD_STYLE}>
            <Space direction="vertical" size={4}>
              <Tag color={principal.tagColor} style={{ fontSize: 18, padding: '4px 12px' }}>
                {principal.etiqueta}
              </Tag>
              <Text type="secondary">
                Confianza: <Text strong>{formatearConfianza(resultado.confianza)}</Text>
              </Text>
            </Space>

            <div style={{ marginTop: 24 }}>
              {resultado.probabilidades.map((p) => {
                const info = infoClase(p.clase);
                return (
                  <div key={p.clase} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>{info.etiqueta}</Text>
                      <Text type="secondary">{formatearConfianza(p.confianza)}</Text>
                    </div>
                    <Progress
                      percent={p.confianza * 100}
                      showInfo={false}
                      strokeColor={info.barColor}
                      size="small"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ruta**

En `zarza-web/src/App.tsx`, agregar el import después de `import { ModelosIAPage } from './modelos-ia/ModelosIAPage';`:

```tsx
import { DeteccionDanosPage } from './deteccion-danos/DeteccionDanosPage';
```

y dentro del bloque existente `<Route element={<PrivateRoute allowedRoles={[Role.ADMIN]} />}>` que contiene `/modelos-ia`, dejarlo así:

```tsx
          <Route element={<PrivateRoute allowedRoles={[Role.ADMIN]} />}>
            <Route path="/modelos-ia" element={<ModelosIAPage />} />
            <Route path="/deteccion-danos" element={<DeteccionDanosPage />} />
          </Route>
```

- [ ] **Step 3: Menú**

En `zarza-web/src/shared/AppShell.tsx`, reemplazar la constante `GROUP_ADMIN`:

```tsx
const GROUP_ADMIN: NavItem[] = [
  { key: '/usuarios', label: 'Usuarios', roles: [Role.ADMIN] },
  { key: '/modelos-ia', label: 'Modelos IA', roles: [Role.ADMIN] },
  { key: '/deteccion-danos', label: 'Detección de Daños (beta)', roles: [Role.ADMIN] },
];
```

- [ ] **Step 4: Verificar que compila**

Run: `cd zarza-web && npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add zarza-web/src/deteccion-danos/DeteccionDanosPage.tsx zarza-web/src/App.tsx zarza-web/src/shared/AppShell.tsx
git commit -m "feat(zarza-web): agregar página provisional de detección de daños"
```

---

### Task 8: Verificación E2E con el stack real

Sin commits de código, salvo que aparezca un bug (en ese caso: fix, test que lo cubra, commit).

- [ ] **Step 1: Levantar el stack desde el worktree**

```bash
cd /home/san/Proyectos/zarza-workspace-deteccion-danos
test -f fruit-inference/damage.pt && test -f fruit-inference/best.pt && echo "modelos OK"
docker compose up --build -d
docker compose ps   # fruit-inference y fruit-backend deben quedar healthy
```

Si otro stack (el del repo principal) ya ocupa los puertos 3001/8000/5672, detenerlo primero o avisar al usuario.

- [ ] **Step 2: Verificar que inferencia cargó el modelo**

```bash
curl -s http://127.0.0.1:8000/health
docker compose logs fruit-inference | grep -i "daños"
```
Expected: `"damage_model_loaded": true` y el log "Modelo de daños cargado" con las 8 clases.

- [ ] **Step 3: Levantar el panel y entrar como ADMIN**

```bash
cd zarza-web && npm run dev   # Vite en :5173, proxy a :3001
```

Si no hay un ADMIN en la base del worktree: `cd fruit-backend && ADMIN_PASSWORD=<contraseña-fuerte-de-prueba> pnpm run seed:admin` (con `DATABASE_URL` apuntando al postgres del compose, puerto 5433).

- [ ] **Step 4: Probar en el navegador (claude-in-chrome), con GIF `deteccion_danos_e2e.gif`**
  - El menú muestra "Detección de Daños (beta)"; la ruta carga sin errores de consola.
  - Subir una foto real de zarzamora sana → resultado con Tag verde, % y 8 barras ordenadas.
  - Subir una foto de fruta enferma o dañada → Tag rojo o naranja.
  - "Analizar otra foto" limpia foto y resultado.
  - Un `.txt` renombrado a `.jpg` → `Alert` de error con mensaje claro, sin romper la página.
  - Un PNG de más de 5 MB → mensaje del cliente y no se envía la petición.
  - Con `docker compose stop fruit-inference` → Alert "Servicio de clasificación no disponible". Después, `docker compose start fruit-inference`.
  - Con un usuario no ADMIN, el item no aparece y `/deteccion-danos` redirige a 403.

- [ ] **Step 5: Verificar que no rompió el flujo fenológico**

Subir una foto por `/analisis` (o `POST /api/v1/ingestion/upload`) y confirmar que el análisis se completa como antes.

- [ ] **Step 6: Bajar el stack**

```bash
docker compose down
```

---

### Task 9: Merge y limpieza

- [ ] **Step 1:** Verificar que todo está commiteado en el worktree (`git status` limpio).
- [ ] **Step 2:** Mergear a `main` desde el repo principal:

```bash
cd /home/san/Proyectos/zarza-workspace
git status --short   # si hay cambios de otra sesión en archivos que toca la rama, parar y avisar al usuario
git merge --no-ff feature/deteccion-danos -m "Merge feature/deteccion-danos: página provisional de detección de daños"
```

- [ ] **Step 3:** Copiar el modelo al repo principal para que su stack también lo tenga: `cp "/home/san/Descargas/modelo-dañadas/best.pt" fruit-inference/damage.pt`
- [ ] **Step 4:** Limpiar: `git worktree remove ../zarza-workspace-deteccion-danos && git branch -d feature/deteccion-danos`. Los `.env` copiados y el symlink `.venv` son ignorados por git, así que `worktree remove` puede exigir `--force`; confirmar antes que `git status` en el worktree esté limpio.
