import importlib

import pytest
from fastapi import HTTPException


def _reload_auth_module():
    from infrastructure import auth as auth_module
    importlib.reload(auth_module)
    return auth_module


def test_raises_at_import_if_token_missing(monkeypatch):
    monkeypatch.delenv("INFERENCE_AUTH_TOKEN", raising=False)

    with pytest.raises(RuntimeError):
        _reload_auth_module()


def test_rejects_wrong_token(monkeypatch):
    monkeypatch.setenv("INFERENCE_AUTH_TOKEN", "correct-token")
    auth_module = _reload_auth_module()

    with pytest.raises(HTTPException) as exc_info:
        auth_module.verify_inference_token(x_inference_token="wrong-token")
    assert exc_info.value.status_code == 401


def test_accepts_correct_token(monkeypatch):
    monkeypatch.setenv("INFERENCE_AUTH_TOKEN", "correct-token")
    auth_module = _reload_auth_module()

    assert auth_module.verify_inference_token(x_inference_token="correct-token") is None
