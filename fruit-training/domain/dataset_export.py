"""
fruit-training — Capa de dominio: exportación del dataset de entrenamiento.

Responsabilidad: transformar el dataset resuelto de fruit-backend (imagen +
detecciones ya corregidas) en la estructura de carpetas que espera
ultralytics (images/, labels/, data.yaml), con normalización de bbox a
formato YOLO y split train/val reproducible por job.
"""

import hashlib
import io
import logging
import random
from pathlib import Path

import httpx
from PIL import Image

from model_config import CLASS_NAMES

logger = logging.getLogger("fruit-training")


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
