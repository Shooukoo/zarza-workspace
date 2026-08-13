"""
fruit-training — Infraestructura: cliente HTTP hacia fruit-backend.

Responsabilidad: obtener el dataset de entrenamiento y reportar el resultado
del job. Aísla toda la configuración de httpx del resto de la aplicación.
"""

import os

import httpx

BACKEND_URL = os.getenv("BACKEND_URL", "http://fruit-backend:3000")
TRAINING_INTERNAL_TOKEN = os.getenv("TRAINING_INTERNAL_TOKEN", "")


def fetch_dataset() -> list[dict]:
    """Obtiene, por análisis revisado, la URL de imagen + detecciones ya resueltas."""
    response = httpx.get(
        f"{BACKEND_URL}/api/v1/internal/training/dataset",
        headers={"x-training-token": TRAINING_INTERNAL_TOKEN},
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def report_success(
    job_id: str, m_ap: float, m_ap_base: float, r2_key: str, dataset_size: int
) -> None:
    """Reporta que el job terminó exitosamente, con las métricas y el .pt subido a R2."""
    _report(
        {
            "jobId": job_id,
            "status": "COMPLETED",
            "mAP": m_ap,
            "mAPBase": m_ap_base,
            "r2Key": r2_key,
            "datasetSize": dataset_size,
        }
    )


def report_failure(job_id: str, error_message: str) -> None:
    """Reporta que el job falló, con el mensaje de la excepción."""
    _report({"jobId": job_id, "status": "FAILED", "errorMessage": error_message})


def _report(payload: dict) -> None:
    response = httpx.post(
        f"{BACKEND_URL}/api/v1/internal/training-complete",
        json=payload,
        headers={"x-training-token": TRAINING_INTERNAL_TOKEN},
        timeout=30.0,
    )
    response.raise_for_status()
