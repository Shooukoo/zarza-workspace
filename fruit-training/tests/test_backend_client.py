import httpx
import pytest


class DummyResponse:
    def __init__(self, json_data=None, status_code=200):
        self._json = json_data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=self)

    def json(self):
        return self._json


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("BACKEND_URL", "http://fruit-backend:3000")
    monkeypatch.setenv("TRAINING_INTERNAL_TOKEN", "shared-token")
    import importlib
    from infrastructure import backend_client as backend_client_module
    importlib.reload(backend_client_module)
    return backend_client_module


def test_fetch_dataset_calls_expected_url_and_headers(monkeypatch, set_env):
    backend_client = set_env
    captured = {}

    def fake_get(url, headers=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        return DummyResponse(json_data=[{"imageUrl": "https://x", "detecciones": []}])

    monkeypatch.setattr(backend_client.httpx, "get", fake_get)

    result = backend_client.fetch_dataset()

    assert captured["url"] == "http://fruit-backend:3000/api/v1/internal/training/dataset"
    assert captured["headers"] == {"x-training-token": "shared-token"}
    assert result == [{"imageUrl": "https://x", "detecciones": []}]


def test_report_success_posts_completed_payload(monkeypatch, set_env):
    backend_client = set_env
    captured = {}

    def fake_post(url, json=None, headers=None, timeout=None):
        captured["url"] = url
        captured["json"] = json
        return DummyResponse()

    monkeypatch.setattr(backend_client.httpx, "post", fake_post)

    backend_client.report_success("job-1", 0.75, 0.60, "models/best_job-1.pt", 42)

    assert captured["url"] == "http://fruit-backend:3000/api/v1/training-complete"
    assert captured["json"] == {
        "jobId": "job-1",
        "status": "COMPLETED",
        "mAP": 0.75,
        "mAPBase": 0.60,
        "r2Key": "models/best_job-1.pt",
        "datasetSize": 42,
    }


def test_report_failure_posts_failed_payload(monkeypatch, set_env):
    backend_client = set_env
    captured = {}

    def fake_post(url, json=None, headers=None, timeout=None):
        captured["json"] = json
        return DummyResponse()

    monkeypatch.setattr(backend_client.httpx, "post", fake_post)

    backend_client.report_failure("job-2", "R2 inaccesible")

    assert captured["json"] == {
        "jobId": "job-2",
        "status": "FAILED",
        "errorMessage": "R2 inaccesible",
    }
