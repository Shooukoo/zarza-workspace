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
