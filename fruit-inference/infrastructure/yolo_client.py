"""
fruit-inference — Infraestructura: cliente YOLO + helpers de conversión de imagen.

Responsabilidad: ejecutar el modelo YOLO sobre un array BGR y retornar
las detecciones en un formato neutral de dominio (list[dict]).
Sin dependencias de FastAPI ni boto3.
"""

import io
import os

import cv2
import numpy as np
from PIL import Image

# El dataset de entrenamiento (Roboflow, ver model-train/dataset_combinado_ago/
# README.roboflow.txt) aplica "Resize to 640x640 (Stretch)" antes de anotar —
# estira la imagen a un cuadrado sin conservar el aspect ratio, sin letterbox.
# El fine-tuning de fruit-training también entrena con imgsz=640. Replicar ese
# mismo stretch aquí (en vez de dejar que Ultralytics haga su letterbox
# preservando aspect ratio por defecto) evita el mismatch entre el
# preprocesamiento de entrenamiento y el de inferencia.
MODEL_INPUT_SIZE = int(os.getenv("MODEL_INPUT_SIZE", "640"))


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

    La imagen se estira a MODEL_INPUT_SIZE x MODEL_INPUT_SIZE (sin conservar
    aspect ratio) antes de correr el modelo, igual que el preprocesamiento
    usado para generar el dataset de entrenamiento. Las bbox devueltas se
    reescalan de vuelta a las dimensiones de bgr_img para que sigan siendo
    válidas sobre la imagen original (overlay en zarza-web, cálculo de peso
    visual).

    Args:
        model:          Instancia del modelo YOLO ya cargado.
        bgr_img:        Array BGR uint8 de OpenCV (ya preprocesado).
        conf_threshold: Umbral de confianza de detección.

    Returns:
        Lista de dicts con keys: class, confidence, bbox (x1, y1, x2, y2),
        con bbox en el espacio de coordenadas de bgr_img.
    """
    orig_h, orig_w = bgr_img.shape[:2]
    model_input = cv2.resize(bgr_img, (MODEL_INPUT_SIZE, MODEL_INPUT_SIZE))
    scale_x = orig_w / MODEL_INPUT_SIZE
    scale_y = orig_h / MODEL_INPUT_SIZE

    results = model.predict(source=model_input, conf=conf_threshold, verbose=False)

    detections = []
    for result in results:
        for box in result.boxes:
            class_id   = int(box.cls[0])
            class_name = result.names[class_id]
            confidence = float(box.conf[0])
            xyxy       = box.xyxy[0].cpu().numpy()
            detections.append({
                "class":      class_name,
                "confidence": confidence,
                "bbox":       (
                    int(xyxy[0] * scale_x),
                    int(xyxy[1] * scale_y),
                    int(xyxy[2] * scale_x),
                    int(xyxy[3] * scale_y),
                ),
            })

    return detections
