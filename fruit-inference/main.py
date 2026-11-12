"""
fruit-inference — Entry point: app FastAPI + lifespan + endpoints.

Toda la lógica de negocio reside en:
  domain/weight.py    → cálculo de peso visual
  domain/analysis.py  → construcción del reporte fenológico
  infrastructure/r2_client.py         → descarga de imágenes desde R2
  infrastructure/yolo_client.py       → ejecución del modelo YOLO
  infrastructure/image_preprocessor.py → normalización de imagen
  infrastructure/damage_classifier.py  → modelo de fruta enferma/dañada

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

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from ultralytics import YOLO

from infrastructure.auth import verify_inference_token
from infrastructure.r2_client import create_r2_client, download_image_bytes, check_object_size
from infrastructure.yolo_client import run_inference, bytes_to_bgr
from infrastructure.image_preprocessor import preprocess
from infrastructure.damage_classifier import InvalidImageError, classify, load_damage_model
from domain.analysis import build_report

from infrastructure.logger import AppLogger

MODEL_PATH          = os.getenv("MODEL_PATH", "model.pt")
R2_BUCKET           = os.getenv("R2_BUCKET_NAME", "")
CONF_THRESHOLD      = float(os.getenv("CONF_THRESHOLD", "0.25"))
ENABLE_COLOR_PREPROCESSING = os.getenv("ENABLE_COLOR_PREPROCESSING", "false").lower() == "true"
PREPROCESSING_DEBUG = os.getenv("PREPROCESSING_DEBUG", "false").lower() == "true"
MAX_IMAGE_SIZE_BYTES = int(os.getenv("MAX_IMAGE_SIZE_MB", "5")) * 1_000_000
DAMAGE_MODEL_PATH   = os.getenv("DAMAGE_MODEL_PATH", "damage.pt")

state: dict = {"model": None, "s3": None, "damage_model": None}
startup_logger = AppLogger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    """Carga el modelo YOLO y el cliente R2 una sola vez al arrancar."""
    startup_logger.info(
        "Cargando modelo YOLO",
        modelPath=MODEL_PATH,
    )

    state["model"] = YOLO(MODEL_PATH)
    startup_logger.info("Modelo YOLO cargado")

    # Opcional: si falta o falla, load_damage_model devuelve None y solo
    # /classify-damage responde 503 — /analyze sigue funcionando.
    state["damage_model"] = load_damage_model(DAMAGE_MODEL_PATH)

    state["s3"] = create_r2_client()
    startup_logger.info("Cliente R2 inicializado")
    yield
    startup_logger.info("Servicio detenido")


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
        "damage_model_loaded": state["damage_model"] is not None,
        "timestamp":    datetime.now(timezone.utc).isoformat(),
    }


@app.post("/analyze", dependencies=[Depends(verify_inference_token)])
def analyze(request: Request, req: AnalyzeRequest):

    trace_id = request.headers.get("x-trace-id")
    logger = AppLogger(trace_id)
    
    
    if state["model"] is None:
        raise HTTPException(status_code=503, detail="Modelo aún no está cargado.")

    image_id = req.image_id or req.storage_key
    logger.info(
            "Solicitud de inferencia recibida",
            imageId=image_id,
            storageKey=req.storage_key,
        )
    # 1. Verificar tamaño antes de descargar
    check_object_size(state["s3"], R2_BUCKET, req.storage_key, MAX_IMAGE_SIZE_BYTES)

    # 2. Descargar imagen desde R2
    image_bytes = download_image_bytes(state["s3"], R2_BUCKET, req.storage_key)

    # 3. Decodificar una sola vez a BGR
    bgr_img = bytes_to_bgr(image_bytes)

    # 4. Preprocesar (opcional; desactivado por defecto, ver ENABLE_COLOR_PREPROCESSING)
    debug_meta = None
    if ENABLE_COLOR_PREPROCESSING:
        try:
            if PREPROCESSING_DEBUG:
                bgr_preprocessed, debug_meta = preprocess(bgr_img, return_debug=True)
            else:
                bgr_preprocessed = preprocess(bgr_img)
        except Exception as e:
            logger.warn(
                "Preprocesamiento falló, usando imagen original",
                error=str(e),
            )
            bgr_preprocessed = bgr_img
    else:
        bgr_preprocessed = bgr_img
        if PREPROCESSING_DEBUG:
            debug_meta = {"preprocessing_enabled": False}

    # 5. Inferencia YOLO
    detections = run_inference(state["model"], bgr_preprocessed, CONF_THRESHOLD)

    # 6. Construir reporte fenológico
    report = build_report(detections, bgr_preprocessed, image_id, req.variedad)

    if debug_meta is not None:
        report["debug_preprocessing"] = debug_meta

    logger.info(
        "Inferencia completada",
        imageId=image_id,
        detections=len(detections),
    )

    return JSONResponse(content=report)


@app.post("/classify-damage", dependencies=[Depends(verify_inference_token)])
def classify_damage(request: Request, file: UploadFile = File(...)):
    """Clasifica una foto (multipart `file`) como sana, dañada o enferma."""
    logger = AppLogger(request.headers.get("x-trace-id"))

    if state["damage_model"] is None:
        raise HTTPException(
            status_code=503, detail="Modelo de clasificación de daños no disponible"
        )

    # Se lee como máximo un byte más del límite: basta para saber si lo excede
    # sin cargar en memoria un archivo arbitrariamente grande.
    image_bytes = file.file.read(MAX_IMAGE_SIZE_BYTES + 1)
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande")

    try:
        result = classify(state["damage_model"], image_bytes)
    except InvalidImageError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info(
        "Clasificación de daños completada",
        clase=result["clase"],
        confianza=result["confianza"],
    )
    return result


@app.post(
    "/internal/prepare-restart", dependencies=[Depends(verify_inference_token)]
)
def prepare_restart(background_tasks: BackgroundTasks):
    """
    Responde 200 de inmediato y, tras enviar la respuesta, termina el proceso.
    Docker (restart: unless-stopped) relanza el contenedor y el lifespan
    recoge el best.pt reemplazado sin cambios adicionales.
    """
    background_tasks.add_task(os._exit, 0)
    return {"status": "restarting"}
