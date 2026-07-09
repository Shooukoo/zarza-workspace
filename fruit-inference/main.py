"""
fruit-inference — Entry point: app FastAPI + lifespan + endpoints.

Toda la lógica de negocio reside en:
  domain/weight.py    → cálculo de peso visual
  domain/analysis.py  → construcción del reporte fenológico
  infrastructure/r2_client.py         → descarga de imágenes desde R2
  infrastructure/yolo_client.py       → ejecución del modelo YOLO
  infrastructure/image_preprocessor.py → normalización de imagen

Este archivo sólo orquesta; no contiene lógica de dominio ni de infraestructura.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv

# Cargar .env ANTES de importar infrastructure.auth, que valida
# INFERENCE_AUTH_TOKEN a nivel de módulo (fail-fast).
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from ultralytics import YOLO

from infrastructure.auth import verify_inference_token
from infrastructure.r2_client import create_r2_client, download_image_bytes, check_object_size
from infrastructure.yolo_client import run_inference, bytes_to_bgr
from infrastructure.image_preprocessor import preprocess
from domain.analysis import build_report

MODEL_PATH          = os.getenv("MODEL_PATH", "model.pt")
R2_BUCKET           = os.getenv("R2_BUCKET_NAME", "")
CONF_THRESHOLD      = float(os.getenv("CONF_THRESHOLD", "0.25"))
PREPROCESSING_DEBUG = os.getenv("PREPROCESSING_DEBUG", "false").lower() == "true"
MAX_IMAGE_SIZE_BYTES = int(os.getenv("MAX_IMAGE_SIZE_MB", "5")) * 1_000_000

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


class AnalyzeRequest(BaseModel):
    storage_key: str
    image_id:    Optional[str] = None
    variedad:    Optional[str] = None


@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model_loaded": state["model"] is not None,
        "timestamp":    datetime.now(timezone.utc).isoformat(),
    }


@app.post("/analyze", dependencies=[Depends(verify_inference_token)])
def analyze(req: AnalyzeRequest):
    if state["model"] is None:
        raise HTTPException(status_code=503, detail="Modelo aún no está cargado.")

    image_id = req.image_id or req.storage_key

    # 1. Verificar tamaño antes de descargar
    check_object_size(state["s3"], R2_BUCKET, req.storage_key, MAX_IMAGE_SIZE_BYTES)

    # 2. Descargar imagen desde R2
    image_bytes = download_image_bytes(state["s3"], R2_BUCKET, req.storage_key)

    # 3. Decodificar una sola vez a BGR
    bgr_img = bytes_to_bgr(image_bytes)

    # 4. Preprocesar (fallback a imagen original si algo falla)
    debug_meta = None
    try:
        if PREPROCESSING_DEBUG:
            bgr_preprocessed, debug_meta = preprocess(bgr_img, return_debug=True)
        else:
            bgr_preprocessed = preprocess(bgr_img)
    except Exception as e:
        print(f"[preprocess] warning: preprocesado falló, usando imagen original. {e}")
        bgr_preprocessed = bgr_img

    # 5. Inferencia YOLO
    detections = run_inference(state["model"], bgr_preprocessed, CONF_THRESHOLD)

    # 6. Construir reporte fenológico
    report = build_report(detections, bgr_preprocessed, image_id, req.variedad)

    if debug_meta is not None:
        report["debug_preprocessing"] = debug_meta

    return JSONResponse(content=report)
