"""
fruit-training — Infraestructura: cliente de Cloudflare R2 (boto3/S3).

Responsabilidad: descargar el modelo base a reentrenar y subir el modelo
resultante del fine-tuning. Aísla toda la configuración de boto3 del resto
de la aplicación.
"""

import os
from pathlib import Path

import boto3
from botocore.config import Config


def create_r2_client():
    """Crea y retorna un cliente boto3 configurado para Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT", ""),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID", ""),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY", ""),
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def download_model_file(s3_client, bucket: str, r2_key: str, dest_path: Path) -> None:
    """Descarga un .pt de R2 a una ruta local, para usarlo como modelo base del fine-tuning."""
    s3_client.download_file(bucket, r2_key, str(dest_path))


def upload_model_file(s3_client, bucket: str, local_path: Path, job_id: str) -> str:
    """Sube el .pt entrenado a R2 bajo el prefijo models/ y retorna su key."""
    r2_key = f"models/best_{job_id}.pt"
    s3_client.upload_file(str(local_path), bucket, r2_key)
    return r2_key
