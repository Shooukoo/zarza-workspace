"""
fruit-inference — Entry point: app FastAPI + lifespan + endpoints.

Toda la lógica de negocio reside en:
  domain/weight.py    → cálculo de peso visual
  domain/analysis.py  → construcción del reporte fenológico
  infrastructure/r2_client.py   → descarga de imágenes desde R2
  infrastructure/yolo_client.py → ejecución del modelo YOLO

Este archivo sólo orquesta; no contiene lógica de dominio ni de infraestructura.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from ultralytics import YOLO

from infrastructure.r2_client import create_r2_client, download_image_bytes
from infrastructure.yolo_client import run_inference, bytes_to_bgr
from domain.analysis import build_report

load_dotenv()

MODEL_PATH     = os.getenv("MODEL_PATH",    "model.pt")
R2_BUCKET      = os.getenv("R2_BUCKET_NAME", "")
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.25"))

# Estado global del servidor (modelo y cliente S3)
state: dict = {"model": None, "s3": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga el modelo YOLO y el cliente R2 una sola vez al arrancar."""
    print(f"[startup] Cargando modelo desde: {MODEL_PATH}")
    state["model"] = YOLO(MODEL_PATH)
    print("[startup] Modelo cargado correctamente.")

    state["s3"] = create_r2_client()
    print("[startup] Cliente R2 listo.")
    yield
    print("[shutdown] Servicio detenido.")


app = FastAPI(title="fruit-inference", lifespan=lifespan)


# ─────────────────────────────────────────────
# Schemas de request
# ─────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    storage_key: str
    image_id:    Optional[str] = None
    variedad:    Optional[str] = None


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model_loaded": state["model"] is not None,
        "timestamp":    datetime.now(timezone.utc).isoformat(),
    }


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    if state["model"] is None:
        raise HTTPException(status_code=503, detail="Modelo aún no está cargado.")

    image_id = req.image_id or req.storage_key

    # 1. Descargar imagen desde R2 (infraestructura)
    image_bytes = download_image_bytes(state["s3"], R2_BUCKET, req.storage_key)

    # 2. Convertir a BGR para cálculo de peso (infraestructura)
    bgr_img = bytes_to_bgr(image_bytes)

    # 3. Inferencia YOLO (infraestructura)
    detections = run_inference(state["model"], image_bytes, CONF_THRESHOLD)

    # 4. Construir reporte fenológico (dominio)
    report = build_report(detections, bgr_img, image_id, req.variedad)

    return JSONResponse(content=report)
