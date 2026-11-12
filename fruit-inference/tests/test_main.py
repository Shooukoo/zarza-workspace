"""
Tests del endpoint interno /internal/prepare-restart. Se importa main.py sin
usar `with TestClient(...)` para NO disparar el lifespan (que cargaría el
modelo YOLO real) — el endpoint no depende de state["model"].
"""

import importlib
from unittest.mock import MagicMock

import numpy as np
import pytest
from fastapi.testclient import TestClient

RAW_IMG = np.zeros((2, 2, 3), dtype=np.uint8)
PROCESSED_IMG = np.ones((2, 2, 3), dtype=np.uint8)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INFERENCE_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("MODEL_PATH", "model.pt")

    # infrastructure.auth lee INFERENCE_AUTH_TOKEN a nivel de módulo y puede
    # haber quedado recargado por otro test (p.ej. test_auth.py) con un valor
    # distinto. Se recarga explícitamente aquí para que main.py importe una
    # verify_inference_token fresca, sin depender del orden de ejecución.
    from infrastructure import auth as auth_module
    importlib.reload(auth_module)

    import main as main_module
    importlib.reload(main_module)
    return TestClient(main_module.app), main_module


def test_prepare_restart_rejects_invalid_token(client):
    test_client, _ = client

    response = test_client.post(
        "/internal/prepare-restart", headers={"x-inference-token": "wrong"}
    )

    assert response.status_code == 401


def test_prepare_restart_returns_200_and_schedules_exit(client, monkeypatch):
    test_client, main_module = client
    exit_calls = []
    monkeypatch.setattr(main_module.os, "_exit", lambda code: exit_calls.append(code))

    response = test_client.post(
        "/internal/prepare-restart", headers={"x-inference-token": "test-token"}
    )

    assert response.status_code == 200
    assert exit_calls == [0]


def test_prepare_restart_with_r2_key_replaces_model_before_exit(client, monkeypatch, tmp_path):
    test_client, main_module = client
    model_path = tmp_path / "model.pt"
    model_path.write_bytes(b"viejo")
    monkeypatch.setattr(main_module, "MODEL_PATH", str(model_path))
    monkeypatch.setattr(main_module, "download_image_bytes", lambda s3, bucket, key: b"nuevo:" + key.encode())
    exit_calls = []
    monkeypatch.setattr(main_module.os, "_exit", lambda code: exit_calls.append(code))

    response = test_client.post(
        "/internal/prepare-restart",
        headers={"x-inference-token": "test-token"},
        json={"r2_key": "models/best_job-1.pt"},
    )

    assert response.status_code == 200
    assert model_path.read_bytes() == b"nuevo:models/best_job-1.pt"
    assert exit_calls == [0]


def test_prepare_restart_keeps_model_and_does_not_exit_when_download_fails(client, monkeypatch, tmp_path):
    test_client, main_module = client
    model_path = tmp_path / "model.pt"
    model_path.write_bytes(b"viejo")
    monkeypatch.setattr(main_module, "MODEL_PATH", str(model_path))

    def fail(s3, bucket, key):
        raise main_module.HTTPException(status_code=404, detail="no existe")

    monkeypatch.setattr(main_module, "download_image_bytes", fail)
    exit_calls = []
    monkeypatch.setattr(main_module.os, "_exit", lambda code: exit_calls.append(code))

    response = test_client.post(
        "/internal/prepare-restart",
        headers={"x-inference-token": "test-token"},
        json={"r2_key": "models/no-existe.pt"},
    )

    assert response.status_code == 404
    assert model_path.read_bytes() == b"viejo"
    assert exit_calls == []


def _reload_main_module(monkeypatch, **env):
    # INFERENCE_AUTH_TOKEN debe estar presente para que infrastructure.auth no
    # lance RuntimeError al re-evaluarse; el valor exacto no importa porque
    # estos tests bypasean verify_inference_token vía dependency_overrides
    # (evita depender del estado global mutable que deja test_auth.py entre tests).
    monkeypatch.setenv("INFERENCE_AUTH_TOKEN", "unused-token")
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    import main as main_module
    importlib.reload(main_module)
    main_module.app.dependency_overrides[main_module.verify_inference_token] = lambda: None
    return main_module


def _wire_mocks(main_module, preprocess_mock=None, run_inference_return=None, build_report_return=None):
    main_module.check_object_size = MagicMock(return_value=None)
    main_module.download_image_bytes = MagicMock(return_value=b"raw-bytes")
    main_module.bytes_to_bgr = MagicMock(return_value=RAW_IMG)
    main_module.run_inference = MagicMock(return_value=run_inference_return or [])
    main_module.build_report = MagicMock(return_value=build_report_return or {"detecciones": []})
    if preprocess_mock is not None:
        main_module.preprocess = preprocess_mock

    main_module.state["model"] = MagicMock()
    main_module.state["s3"] = MagicMock()


def _analyze(main_module):
    client = TestClient(main_module.app)
    return client.post("/analyze", json={"storage_key": "test.jpg"})


def test_preprocessing_disabled_by_default_does_not_call_preprocess(monkeypatch):
    main_module = _reload_main_module(monkeypatch)
    preprocess_mock = MagicMock()
    _wire_mocks(main_module, preprocess_mock=preprocess_mock)

    response = _analyze(main_module)

    assert response.status_code == 200
    preprocess_mock.assert_not_called()
    _, run_inference_img, _ = main_module.run_inference.call_args.args
    assert run_inference_img is RAW_IMG
    build_report_img = main_module.build_report.call_args.args[1]
    assert build_report_img is RAW_IMG
    assert "debug_preprocessing" not in response.json()


def test_enabled_with_debug_calls_preprocess_and_reports_meta(monkeypatch):
    main_module = _reload_main_module(
        monkeypatch,
        ENABLE_COLOR_PREPROCESSING="true",
        PREPROCESSING_DEBUG="true",
    )
    meta = {"wb_applied": True, "wb_skipped_reason": None, "clahe_applied": True}
    preprocess_mock = MagicMock(return_value=(PROCESSED_IMG, meta))
    _wire_mocks(main_module, preprocess_mock=preprocess_mock)

    response = _analyze(main_module)

    assert response.status_code == 200
    preprocess_mock.assert_called_once_with(RAW_IMG, return_debug=True)
    _, run_inference_img, _ = main_module.run_inference.call_args.args
    assert run_inference_img is PROCESSED_IMG
    assert response.json()["debug_preprocessing"] == meta


def test_disabled_with_debug_reports_preprocessing_enabled_false(monkeypatch):
    main_module = _reload_main_module(
        monkeypatch,
        ENABLE_COLOR_PREPROCESSING="false",
        PREPROCESSING_DEBUG="true",
    )
    preprocess_mock = MagicMock()
    _wire_mocks(main_module, preprocess_mock=preprocess_mock)

    response = _analyze(main_module)

    assert response.status_code == 200
    preprocess_mock.assert_not_called()
    assert response.json()["debug_preprocessing"] == {"preprocessing_enabled": False}


def test_enabled_falls_back_to_original_image_on_preprocess_error(monkeypatch):
    main_module = _reload_main_module(
        monkeypatch,
        ENABLE_COLOR_PREPROCESSING="true",
    )
    preprocess_mock = MagicMock(side_effect=RuntimeError("boom"))
    _wire_mocks(main_module, preprocess_mock=preprocess_mock)

    response = _analyze(main_module)

    assert response.status_code == 200
    preprocess_mock.assert_called_once_with(RAW_IMG)
    _, run_inference_img, _ = main_module.run_inference.call_args.args
    assert run_inference_img is RAW_IMG
