"""
Verifica que fruit-training/model_config.py y fruit-inference/model_config.py
tengan exactamente las mismas clases, en el mismo orden. Si se desincronizan,
las predicciones de fruit-inference se interpretarían con el mapeo equivocado
al entrenar.
"""

import importlib.util
import sys
from pathlib import Path


def _load_fruit_inference_class_map() -> dict:
    fruit_inference_path = (
        Path(__file__).resolve().parents[2] / "fruit-inference" / "model_config.py"
    )
    spec = importlib.util.spec_from_file_location(
        "fruit_inference_model_config", fruit_inference_path
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.CLASS_MAP


def test_class_map_matches_fruit_inference_exactly():
    from model_config import CLASS_MAP as training_class_map

    inference_class_map = _load_fruit_inference_class_map()

    assert list(training_class_map.keys()) == list(inference_class_map.keys())
    assert training_class_map == inference_class_map
