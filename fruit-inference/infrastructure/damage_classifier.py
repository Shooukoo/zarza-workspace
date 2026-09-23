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
import threading

from PIL import Image, ImageOps
from ultralytics import YOLO

from infrastructure.logger import AppLogger

DAMAGE_MODEL_INPUT_SIZE = 224

# ~40 MP, muy por encima de cualquier foto de celular. Evita que una imagen
# con pocos bytes pero dimensiones enormes (ej. PNG comprimido) provoque una
# asignación de memoria descontrolada al decodificar (PIL solo protege por
# defecto a partir de ~179 MP).
MAX_DECODE_PIXELS = 40_000_000

_logger = AppLogger()

# model.predict() de Ultralytics no es thread-safe sobre una misma instancia
# de modelo; el endpoint que llamará a classify() corre en el threadpool
# síncrono de Starlette, así que serializamos las inferencias.
_predict_lock = threading.Lock()


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
        if img.width * img.height > MAX_DECODE_PIXELS:
            raise InvalidImageError("Imagen demasiado grande")
        # Decodifica el JPEG ya reducido a ~2x el tamaño de entrada del modelo
        # (no-op para PNG/otros formatos sin soporte de draft); conserva el
        # aspect ratio, así que aplicarlo antes de exif_transpose es correcto.
        img.draft("RGB", (DAMAGE_MODEL_INPUT_SIZE * 2, DAMAGE_MODEL_INPUT_SIZE * 2))
        img.load()
        img = ImageOps.exif_transpose(img)
        return img.convert("RGB")
    except InvalidImageError:
        raise
    except MemoryError:
        raise
    except Exception as e:
        raise InvalidImageError("Imagen inválida") from e


def classify(model, image_bytes: bytes) -> dict:
    """
    Clasifica la imagen y devuelve la clase más probable junto con la
    probabilidad de todas las clases, ordenadas de mayor a menor.
    """
    img = decode_image(image_bytes)
    with _predict_lock:
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
