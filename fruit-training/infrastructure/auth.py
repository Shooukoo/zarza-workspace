"""
fruit-training — Infraestructura: autenticación por token compartido.

Responsabilidad: validar que las llamadas a /train incluyan el header
x-training-token con el valor esperado (TRAINING_INTERNAL_TOKEN). El mismo
token se usa en sentido inverso cuando fruit-training llama a los endpoints
internos de fruit-backend (ver infrastructure/backend_client.py).
"""

import os
import secrets

from fastapi import Header, HTTPException

TRAINING_INTERNAL_TOKEN = os.getenv("TRAINING_INTERNAL_TOKEN", "")

if not TRAINING_INTERNAL_TOKEN:
    raise RuntimeError("TRAINING_INTERNAL_TOKEN env var is required")


def verify_training_token(x_training_token: str = Header(...)) -> None:
    """Lanza 401 si el header x-training-token no coincide con el esperado."""
    if not secrets.compare_digest(x_training_token, TRAINING_INTERNAL_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid training token")
