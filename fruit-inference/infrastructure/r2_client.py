"""
fruit-inference — Infraestructura: cliente de Cloudflare R2 (boto3/S3).

Responsabilidad: descargar bytes de imágenes desde el bucket R2.
Aísla toda la configuración de boto3 del resto de la aplicación.
"""

import os
import boto3
from botocore.config import Config
from fastapi import HTTPException


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


def check_object_size(s3_client, bucket: str, storage_key: str, max_bytes: int) -> None:
    """
    Verifica el tamaño del objeto en R2 antes de descargarlo, sin traerlo a memoria.

    Raises:
        HTTPException 404 si el objeto no existe o no se puede verificar.
        HTTPException 400 si el tamaño excede max_bytes.
    """
    try:
        head = s3_client.head_object(Bucket=bucket, Key=storage_key)
    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=f"No se pudo verificar la imagen '{storage_key}': {exc}",
        )
    if head["ContentLength"] > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=(
                f"La imagen '{storage_key}' excede el tamaño máximo permitido "
                f"({max_bytes} bytes)"
            ),
        )


def download_image_bytes(s3_client, bucket: str, storage_key: str) -> bytes:
    """
    Descarga una imagen de Cloudflare R2 y retorna sus bytes.

    Args:
        s3_client:   Cliente boto3 ya inicializado.
        bucket:      Nombre del bucket R2.
        storage_key: Clave del objeto en el bucket.

    Raises:
        HTTPException 404 si el objeto no existe o no se puede descargar.
    """
    try:
        response = s3_client.get_object(Bucket=bucket, Key=storage_key)
        return response["Body"].read()
    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=f"No se pudo descargar la imagen '{storage_key}': {exc}",
        )
