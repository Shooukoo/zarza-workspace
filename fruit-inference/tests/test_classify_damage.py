"""
Tests de POST /classify-damage y de la carga del modelo de daños en el
lifespan. Igual que test_main.py, se usa TestClient sin `with` (no dispara el
lifespan) salvo en el test que verifica justamente el lifespan.
"""

import importlib
import io
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from PIL import Image

RESULT = {
    "clase": "botrytis",
    "confianza": 0.9,
    "probabilidades": [{"clase": "botrytis", "confianza": 0.9}],
}


def _jpeg_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (8, 8)).save(buf, "JPEG")
    return buf.getvalue()


def _reload_main(monkeypatch, bypass_auth=True, **env):
    monkeypatch.setenv("INFERENCE_AUTH_TOKEN", "test-token")
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    # infrastructure.auth lee el token a nivel de módulo y otro test puede
    # haberlo recargado con otro valor; se recarga antes que main.
    from infrastructure import auth as auth_module
    importlib.reload(auth_module)

    import main as main_module
    importlib.reload(main_module)
    if bypass_auth:
        main_module.app.dependency_overrides[main_module.verify_inference_token] = lambda: None
    return main_module


def _post(main_module, content, headers=None):
    client = TestClient(main_module.app)
    return client.post(
        "/classify-damage",
        files={"file": ("foto.jpg", content, "image/jpeg")},
        headers=headers or {},
    )


def test_returns_classification(monkeypatch):
    main_module = _reload_main(monkeypatch)
    model = MagicMock()
    main_module.state["damage_model"] = model
    classify_mock = MagicMock(return_value=RESULT)
    monkeypatch.setattr(main_module, "classify", classify_mock)
    content = _jpeg_bytes()

    response = _post(main_module, content)

    assert response.status_code == 200
    assert response.json() == RESULT
    classify_mock.assert_called_once_with(model, content)


def test_returns_503_when_model_not_loaded(monkeypatch):
    main_module = _reload_main(monkeypatch)
    main_module.state["damage_model"] = None

    response = _post(main_module, _jpeg_bytes())

    assert response.status_code == 503
    assert response.json()["detail"] == "Modelo de clasificación de daños no disponible"


def test_returns_400_for_invalid_image(monkeypatch):
    main_module = _reload_main(monkeypatch)
    main_module.state["damage_model"] = MagicMock()

    response = _post(main_module, b"no soy una imagen")

    assert response.status_code == 400
    assert response.json()["detail"] == "Imagen inválida"


def test_returns_400_with_classifier_message(monkeypatch):
    main_module = _reload_main(monkeypatch)
    main_module.state["damage_model"] = MagicMock()
    monkeypatch.setattr(
        main_module,
        "classify",
        MagicMock(side_effect=main_module.InvalidImageError("Imagen demasiado grande")),
    )

    response = _post(main_module, _jpeg_bytes())

    assert response.status_code == 400
    assert response.json()["detail"] == "Imagen demasiado grande"


def test_returns_413_when_image_too_large(monkeypatch):
    main_module = _reload_main(monkeypatch, MAX_IMAGE_SIZE_MB="1")
    main_module.state["damage_model"] = MagicMock()
    classify_mock = MagicMock(return_value=RESULT)
    monkeypatch.setattr(main_module, "classify", classify_mock)

    response = _post(main_module, b"\xff" * 1_000_001)

    assert response.status_code == 413
    classify_mock.assert_not_called()


def test_rejects_invalid_token(monkeypatch):
    main_module = _reload_main(monkeypatch, bypass_auth=False)
    main_module.state["damage_model"] = MagicMock()

    response = _post(main_module, _jpeg_bytes(), headers={"x-inference-token": "wrong"})

    assert response.status_code == 401


def test_lifespan_loads_damage_model_and_health_reports_it(monkeypatch):
    main_module = _reload_main(monkeypatch, DAMAGE_MODEL_PATH="custom-damage.pt")
    sentinel = MagicMock()
    load_mock = MagicMock(return_value=sentinel)
    monkeypatch.setattr(main_module, "YOLO", MagicMock())
    monkeypatch.setattr(main_module, "create_r2_client", MagicMock())
    monkeypatch.setattr(main_module, "load_damage_model", load_mock)

    with TestClient(main_module.app) as client:
        assert main_module.state["damage_model"] is sentinel
        assert client.get("/health").json()["damage_model_loaded"] is True

    load_mock.assert_called_once_with("custom-damage.pt")
