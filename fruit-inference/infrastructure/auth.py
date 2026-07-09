"""
fruit-inference — Infraestructura: autenticación por token compartido.

Responsabilidad: validar que las llamadas a /analyze incluyan el header
x-inference-token con el valor esperado (INFERENCE_AUTH_TOKEN).
"""

import os
import secrets

from fastapi import Header, HTTPException

INFERENCE_AUTH_TOKEN = os.getenv("INFERENCE_AUTH_TOKEN", "")

if not INFERENCE_AUTH_TOKEN:
    raise RuntimeError("INFERENCE_AUTH_TOKEN env var is required")


def verify_inference_token(x_inference_token: str = Header(...)) -> None:
    """Lanza 401 si el header x-inference-token no coincide con el esperado."""
    if not secrets.compare_digest(x_inference_token, INFERENCE_AUTH_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid inference token")
