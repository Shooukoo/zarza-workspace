"""
Tests de infrastructure/yolo_client.py — foco en que la imagen se estire a
MODEL_INPUT_SIZE antes de invocar al modelo y que las bbox devueltas queden
reescaladas al espacio de coordenadas de la imagen original.
"""

from unittest.mock import MagicMock

import numpy as np
import pytest

from infrastructure import yolo_client


class _FakeBox:
    def __init__(self, cls_id, confidence, xyxy):
        self.cls = [cls_id]
        self.conf = [confidence]
        self.xyxy = [_FakeTensor(xyxy)]


class _FakeTensor:
    def __init__(self, values):
        self._values = np.array(values, dtype=np.float32)

    def cpu(self):
        return self

    def numpy(self):
        return self._values


class _FakeResult:
    def __init__(self, boxes, names):
        self.boxes = boxes
        self.names = names


def test_resizes_image_to_model_input_size_before_predict(monkeypatch):
    monkeypatch.setattr(yolo_client, "MODEL_INPUT_SIZE", 640)
    model = MagicMock()
    model.predict.return_value = [_FakeResult(boxes=[], names={})]

    orig_img = np.zeros((1080, 1920, 3), dtype=np.uint8)
    yolo_client.run_inference(model, orig_img, conf_threshold=0.25)

    called_source = model.predict.call_args.kwargs["source"]
    assert called_source.shape[:2] == (640, 640)


def test_rescales_bbox_back_to_original_image_dimensions(monkeypatch):
    monkeypatch.setattr(yolo_client, "MODEL_INPUT_SIZE", 640)
    model = MagicMock()
    # bbox en el espacio 640x640 estirado
    box = _FakeBox(cls_id=0, confidence=0.9, xyxy=[64.0, 64.0, 128.0, 128.0])
    model.predict.return_value = [_FakeResult(boxes=[box], names={0: "maduro"})]

    # Imagen original de 1280x1280 -> escala 2x en ambos ejes respecto a 640
    orig_img = np.zeros((1280, 1280, 3), dtype=np.uint8)
    detections = yolo_client.run_inference(model, orig_img, conf_threshold=0.25)

    assert detections == [
        {
            "class": "maduro",
            "confidence": pytest.approx(0.9),
            "bbox": (128, 128, 256, 256),
        }
    ]


def test_rescales_bbox_independently_per_axis_for_non_square_images(monkeypatch):
    monkeypatch.setattr(yolo_client, "MODEL_INPUT_SIZE", 640)
    model = MagicMock()
    box = _FakeBox(cls_id=0, confidence=0.5, xyxy=[0.0, 0.0, 640.0, 640.0])
    model.predict.return_value = [_FakeResult(boxes=[box], names={0: "verde"})]

    # Imagen original 1920x960 (ancho x alto) -> distinta escala en x e y
    orig_img = np.zeros((960, 1920, 3), dtype=np.uint8)
    detections = yolo_client.run_inference(model, orig_img, conf_threshold=0.25)

    assert detections[0]["bbox"] == (0, 0, 1920, 960)
