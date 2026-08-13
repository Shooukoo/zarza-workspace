# fruit-inference

Servicio de inferencia de visión computacional de Zarza AI. FastAPI + YOLOv8, accesible solo dentro de la red Docker interna (`fruit-net`). Recibe una referencia a una imagen en Cloudflare R2, la analiza y devuelve un reporte fenológico estructurado.

Ver también el [README raíz](../README.md) para la arquitectura completa del sistema.

## Responsabilidades

- Descargar la imagen desde Cloudflare R2 (`boto3`).
- Preprocesar la imagen opcionalmente (balance de blancos Gray World + CLAHE sobre el canal L de LAB), desactivado por defecto — ver `ENABLE_COLOR_PREPROCESSING`.
- Ejecutar la inferencia YOLOv8 (`best.pt`) sobre la imagen (preprocesada solo si `ENABLE_COLOR_PREPROCESSING=true`).
- Clasificar cada fruto detectado en una de las 7 etapas fenológicas.
- Estimar el peso por fruto (segmentación HSV + ajuste de elipse sobre el bounding box), con fallback al peso tabulado por etapa si la estimación visual falla.
- Calcular métricas de salud (sanos/enfermos, % de merma) y el cronograma de días para cosecha.

## Stack

Python 3.11 · FastAPI · Ultralytics YOLOv8 · OpenCV (`opencv-python-headless`) · Pillow · `boto3` (Cloudflare R2) · Pydantic · `python-dotenv`.

## Estructura del código

```
├── main.py                          # FastAPI app, lifespan (carga el modelo una sola vez), rutas
├── model_config.py                  # CLASS_MAP (peso_g, etapa), DIAS_PREDICCION, VARIEDADES_SOPORTADAS
├── domain/
│   ├── analysis.py                  # build_report() — agrega detecciones en el reporte final
│   └── weight.py                    # calcular_peso_visual() — estimación de peso por segmentación HSV
├── infrastructure/
│   ├── auth.py                      # verify_inference_token() — valida header x-inference-token
│   ├── r2_client.py                 # cliente S3/R2: check_object_size, download_image_bytes
│   ├── yolo_client.py                # bytes_to_bgr, run_inference (wrapper sobre model.predict)
│   └── image_preprocessor.py         # preprocess() — balance de blancos + CLAHE, opcional (ENABLE_COLOR_PREPROCESSING), con metadata de debug
└── tests/                            # pytest: auth, r2_client, image_preprocessor
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | Ninguna | `{ status, model_loaded, timestamp }`. Usado por el healthcheck de Docker. |
| `POST` | `/analyze` | Header `x-inference-token` | Body: `{ storage_key, image_id?, variedad? }`. Descarga, preprocesa opcionalmente (`ENABLE_COLOR_PREPROCESSING`), infiere y retorna el reporte JSON (incluye `debug_preprocessing` si `PREPROCESSING_DEBUG=true`). |

## Etapas fenológicas (`model_config.py`)

Coincide exactamente con la tabla del [README raíz](../README.md#etapas-fenológicas-detectadas): `boton` (0.1 g / 45 días), `flor` (0.2 g / 35 días), `verde` (1.8 g / 28 días), `naranja` (3.5 g / 8 días), `marron` (4.5 g / 3 días), `maduro` (6.0 g / 0 días), `zarzamora` (3.0 g / 0 días). Variedades soportadas: `regina`, `aketzali`, `amelali`, `erandi`.

## Variables de entorno (`.env.example`)

```env
MODEL_PATH=best.pt
CONF_THRESHOLD=0.25

# Cloudflare R2 (lectura)
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=fruit-images

# Preprocesado (balance de blancos Gray World + CLAHE)
# DESACTIVADO por defecto: el modelo se entrenó sin ninguna corrección
# determinista de color, y este preprocesado reducía las detecciones
# frente al pipeline de entrenamiento. Activar solo para pruebas A/B.
ENABLE_COLOR_PREPROCESSING=false
CLAHE_CLIP_LIMIT=
CLAHE_TILE_SIZE=
PREPROCESSING_DEBUG=false

# Seguridad
INFERENCE_AUTH_TOKEN=

# Límite de tamaño de imagen aceptado
MAX_IMAGE_SIZE_MB=5
```

> `INFERENCE_AUTH_TOKEN` es obligatorio: el módulo `infrastructure/auth.py` lanza `RuntimeError` al importarse si no está configurado. Debe coincidir con el valor que usa `fruit-ms` al llamar a `/analyze`.

## Comandos

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
pytest                              # Unit tests
```

Cobertura de tests real en: `test_auth.py` (token faltante/incorrecto/correcto), `test_r2_client.py` (tamaño de objeto, 404/400), `test_image_preprocessor.py` (guardas de imagen negra, corrección de canal rojo, preservación de forma/dtype, CLAHE solo en el canal L), `test_main.py` (`ENABLE_COLOR_PREPROCESSING` on/off, `debug_preprocessing`, fallback ante excepción). Pendiente: tests de `domain/analysis.py`, `domain/weight.py`, `yolo_client.py`.

## Docker

Imagen `python:3.11-slim` con `libglib2.0-0`/`libgl1` (dependencias de runtime de OpenCV). El archivo de pesos **no se copia dentro de la imagen**: `docker-compose.yml` lo monta como volumen de solo lectura (`./fruit-inference/best.pt:/app/model.pt:ro`), por lo que `fruit-inference/best.pt` debe existir antes de `docker compose up`. Puerto `8000`, expuesto solo en `127.0.0.1`.
