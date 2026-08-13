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
