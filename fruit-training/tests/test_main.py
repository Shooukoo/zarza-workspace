"""
Tests de orquestación de main.py. Se monkeypatchean todas las dependencias
externas de run_training_job (red, R2, ultralytics) para verificar sólo el
flujo de control y el contrato con backend_client.
"""

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def app_module(monkeypatch):
    monkeypatch.setenv("TRAINING_INTERNAL_TOKEN", "test-token")
    monkeypatch.setenv("BACKEND_URL", "http://fruit-backend:3000")
    monkeypatch.setenv("R2_BUCKET_NAME", "bucket")
    monkeypatch.setenv("FALLBACK_MODEL_PATH", "base-model.pt")
    monkeypatch.setenv("TRAINING_EPOCHS", "5")

    # infrastructure.auth e infrastructure.backend_client leen
    # TRAINING_INTERNAL_TOKEN/BACKEND_URL a nivel de módulo y pueden haber
    # quedado recargados por otro test (p.ej. test_auth.py, test_backend_client.py)
    # con un valor distinto. `importlib.reload(main_module)` no cascadea a los
    # submódulos ya importados por `from X import Y`, así que se recargan
    # explícitamente aquí, ANTES de recargar main, para que éste importe
    # funciones frescas y no dependa del orden de ejecución de los tests.
    from infrastructure import auth as auth_module
    importlib.reload(auth_module)
    from infrastructure import backend_client as backend_client_module
    importlib.reload(backend_client_module)

    import main as main_module
    importlib.reload(main_module)
    return main_module


def test_train_endpoint_rejects_invalid_token(app_module):
    client = TestClient(app_module.app)

    response = client.post(
        "/train",
        json={"job_id": "job-1", "base_model_r2_key": None},
        headers={"x-training-token": "wrong"},
    )

    assert response.status_code == 401


def test_train_endpoint_returns_202_and_schedules_background_job(app_module, monkeypatch):
    calls = []
    monkeypatch.setattr(
        app_module, "run_training_job", lambda job_id, base_model_r2_key: calls.append((job_id, base_model_r2_key))
    )
    client = TestClient(app_module.app)

    response = client.post(
        "/train",
        json={"job_id": "job-1", "base_model_r2_key": "models/best_v3.pt"},
        headers={"x-training-token": "test-token"},
    )

    assert response.status_code == 202
    assert calls == [("job-1", "models/best_v3.pt")]


def test_run_training_job_happy_path_reports_success(app_module, monkeypatch):
    monkeypatch.setattr(app_module, "fetch_dataset", lambda: [{"imageUrl": "x", "detecciones": []}])
    monkeypatch.setattr(app_module, "export_dataset", lambda entries, job_id, out_dir: 7)
    monkeypatch.setattr(app_module, "_resolve_base_model_path", lambda key, tmp: "base.pt")

    fake_trained_model = type("M", (), {"save": lambda self, path: None})()
    monkeypatch.setattr(app_module, "run_training", lambda base, yaml, epochs: fake_trained_model)
    monkeypatch.setattr(app_module, "evaluate", lambda model, yaml: 0.9)
    monkeypatch.setattr(app_module, "create_r2_client", lambda: object())
    # run_training_job también construye un YOLO real para el modelo base
    # (evaluación comparativa). Se monkeypatchea porque "base.pt" no existe
    # como archivo real en el entorno de test; `evaluate` ya está mockeado y
    # descarta el objeto retornado, así que un stub simple es suficiente.
    monkeypatch.setattr(app_module, "YOLO", lambda path: object())
    monkeypatch.setattr(app_module, "upload_model_file", lambda s3, bucket, path, job_id: "models/best_job-1.pt")

    reported = {}
    monkeypatch.setattr(
        app_module,
        "report_success",
        lambda job_id, m_ap, m_ap_base, r2_key, dataset_size: reported.update(
            job_id=job_id, m_ap=m_ap, m_ap_base=m_ap_base, r2_key=r2_key, dataset_size=dataset_size
        ),
    )

    app_module.run_training_job("job-1", None)

    assert reported == {
        "job_id": "job-1",
        "m_ap": 0.9,
        "m_ap_base": 0.9,
        "r2_key": "models/best_job-1.pt",
        "dataset_size": 7,
    }


def test_run_training_job_no_reporta_failure_si_report_success_falla(app_module, monkeypatch):
    # Si el job terminó bien (entrenó, evaluó, subió a R2) pero el POST final
    # a fruit-backend falla, el job NO debe reportarse como FAILED: eso
    # marcaría como fallido un job que en realidad produjo un modelo válido
    # ya subido a R2, dejándolo huérfano sin poder promoverlo.
    monkeypatch.setattr(app_module, "fetch_dataset", lambda: [{"imageUrl": "x", "detecciones": []}])
    monkeypatch.setattr(app_module, "export_dataset", lambda entries, job_id, out_dir: 7)
    monkeypatch.setattr(app_module, "_resolve_base_model_path", lambda key, tmp: "base.pt")

    fake_trained_model = type("M", (), {"save": lambda self, path: None})()
    monkeypatch.setattr(app_module, "run_training", lambda base, yaml, epochs: fake_trained_model)
    monkeypatch.setattr(app_module, "evaluate", lambda model, yaml: 0.9)
    monkeypatch.setattr(app_module, "create_r2_client", lambda: object())
    monkeypatch.setattr(app_module, "YOLO", lambda path: object())
    monkeypatch.setattr(app_module, "upload_model_file", lambda s3, bucket, path, job_id: "models/best_job-1.pt")

    def raise_error(*args, **kwargs):
        raise RuntimeError("timeout reportando a fruit-backend")

    monkeypatch.setattr(app_module, "report_success", raise_error)
    failure_calls = []
    monkeypatch.setattr(
        app_module, "report_failure", lambda job_id, error_message: failure_calls.append((job_id, error_message))
    )

    app_module.run_training_job("job-1", None)

    assert failure_calls == []


def test_run_training_job_reports_failure_on_exception(app_module, monkeypatch):
    def raise_error():
        raise RuntimeError("R2 inaccesible")

    monkeypatch.setattr(app_module, "fetch_dataset", raise_error)

    reported = {}
    monkeypatch.setattr(
        app_module, "report_failure", lambda job_id, error_message: reported.update(job_id=job_id, error_message=error_message)
    )

    app_module.run_training_job("job-2", None)

    assert reported["job_id"] == "job-2"
    assert "R2 inaccesible" in reported["error_message"]


def test_health_endpoint(app_module):
    client = TestClient(app_module.app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
