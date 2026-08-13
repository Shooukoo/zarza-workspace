"""
fruit-training — Entry point: app FastAPI + orquestación del job de entrenamiento.

Toda la lógica de negocio reside en:
  domain/dataset_export.py  → normalización de bbox + split + escritura del dataset
  domain/training.py        → fine-tuning y evaluación (ultralytics)
  infrastructure/r2_client.py       → descarga/subida de .pt en R2
  infrastructure/backend_client.py  → obtiene el dataset y reporta el resultado

Este archivo sólo orquesta; no contiene lógica de dominio ni de infraestructura.
"""

import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Cargar .env ANTES de importar infrastructure.auth, que valida
# TRAINING_INTERNAL_TOKEN a nivel de módulo (fail-fast).
load_dotenv()

from fastapi import BackgroundTasks, Depends, FastAPI
from pydantic import BaseModel
from ultralytics import YOLO

from infrastructure.auth import verify_training_token
from infrastructure.backend_client import fetch_dataset, report_failure, report_success
from infrastructure.r2_client import create_r2_client, download_model_file, upload_model_file
from domain.dataset_export import export_dataset
from domain.training import evaluate, run_training

R2_BUCKET = os.getenv("R2_BUCKET_NAME", "")
FALLBACK_MODEL_PATH = os.getenv("FALLBACK_MODEL_PATH", "base-model.pt")
TRAINING_EPOCHS = int(os.getenv("TRAINING_EPOCHS", "50"))

logger = logging.getLogger("fruit-training")

app = FastAPI(title="fruit-training")


class TrainRequest(BaseModel):
    job_id: str
    base_model_r2_key: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/train", status_code=202, dependencies=[Depends(verify_training_token)])
def train(req: TrainRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_training_job, req.job_id, req.base_model_r2_key)
    return {"status": "accepted"}


def run_training_job(job_id: str, base_model_r2_key: Optional[str]) -> None:
    try:
        entries = fetch_dataset()
        with tempfile.TemporaryDirectory() as tmp:
            dataset_dir = Path(tmp)
            dataset_size = export_dataset(entries, job_id, dataset_dir)
            dataset_yaml = dataset_dir / "data.yaml"

            base_model_path = _resolve_base_model_path(base_model_r2_key, dataset_dir)

            trained_model = run_training(base_model_path, dataset_yaml, TRAINING_EPOCHS)
            m_ap = evaluate(trained_model, dataset_yaml)

            base_model = YOLO(base_model_path)
            m_ap_base = evaluate(base_model, dataset_yaml)

            trained_pt_path = dataset_dir / f"best_{job_id}.pt"
            trained_model.save(str(trained_pt_path))

            s3 = create_r2_client()
            r2_key = upload_model_file(s3, R2_BUCKET, trained_pt_path, job_id)

            report_success(job_id, m_ap, m_ap_base, r2_key, dataset_size)
    except Exception as exc:
        logger.exception("Job de entrenamiento falló (jobId=%s)", job_id)
        report_failure(job_id, str(exc))


def _resolve_base_model_path(base_model_r2_key: Optional[str], tmp_dir: Path) -> str:
    if base_model_r2_key is None:
        return FALLBACK_MODEL_PATH

    local_path = tmp_dir / "base_model.pt"
    s3 = create_r2_client()
    download_model_file(s3, R2_BUCKET, base_model_r2_key, local_path)
    return str(local_path)
