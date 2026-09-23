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


def test_classify_rejects_images_over_max_decode_pixels(monkeypatch):
    model = _fake_model([1.0] + [0.0] * 7)
    monkeypatch.setattr(damage_classifier, "MAX_DECODE_PIXELS", 100)

    with pytest.raises(InvalidImageError, match="Imagen demasiado grande"):
        classify(model, _image_bytes())

    model.predict.assert_not_called()


def test_classify_rounds_confidence_to_four_decimals():
    model = _fake_model([0.123456, 0.5, 0.1, 0.1, 0.05, 0.05, 0.02, 0.056544])

    result = classify(model, _image_bytes())

    antracnosis = next(p for p in result["probabilidades"] if p["clase"] == "antracnosis")
    assert antracnosis["confianza"] == pytest.approx(0.1235, abs=1e-4)
