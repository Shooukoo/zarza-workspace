"""
Tests del endpoint interno /internal/prepare-restart. Se importa main.py sin
usar `with TestClient(...)` para NO disparar el lifespan (que cargaría el
modelo YOLO real) — el endpoint no depende de state["model"].
"""

import importlib

import pytest
from fastapi.testclient import TestClient


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
