"""
fruit-inference — Infraestructura: cliente YOLO + helpers de conversión de imagen.

Responsabilidad: ejecutar el modelo YOLO sobre bytes de imagen y retornar
las detecciones en un formato neutral de dominio (list[dict]).
Sin dependencias de FastAPI ni boto3.
"""

import io
from typing import Optional

import cv2
import numpy as np
from PIL import Image


def bytes_to_bgr(image_bytes: bytes) -> np.ndarray:
    """Convierte bytes de imagen a array BGR de OpenCV."""
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def run_inference(
    model,
    image_bytes: bytes,
    conf_threshold: float,
) -> list[dict]:
    """
    Ejecuta el modelo YOLO sobre los bytes de imagen y retorna las detecciones.

    Args:
        model:          Instancia del modelo YOLO ya cargado.
        image_bytes:    Bytes de la imagen.
        conf_threshold: Umbral de confianza de detección.

    Returns:
        Lista de dicts con keys: class, confidence, bbox (x1, y1, x2, y2).
    """
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    results  = model.predict(source=pil_img, conf=conf_threshold, verbose=False)

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
