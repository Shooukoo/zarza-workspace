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
