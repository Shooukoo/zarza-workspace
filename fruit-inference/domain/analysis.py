"""
fruit-inference — Capa de dominio: construcción del reporte de análisis fenológico.

Responsabilidad: transformar las detecciones de YOLO en métricas de dominio.
Sin dependencias de FastAPI, boto3, ni del modelo YOLO directamente.
"""

from datetime import datetime, timezone
from typing import Optional

import numpy as np

from model_config import CLASS_MAP, DIAS_PREDICCION
from domain.weight import calcular_peso_visual

# Clases con fruto real (aplica cálculo por elipse)
CLASES_CON_FRUTO = {"verde", "naranja", "marron", "maduro", "zarzamora", "deteccion_gen"}


def build_report(
    detections: list[dict],
    bgr_img:    np.ndarray,
    image_id:   str,
    variedad:   Optional[str],
) -> dict:
    """
    Construye el JSON estructurado de métricas a partir de las detecciones YOLO.

    Args:
        detections: Lista de dicts con keys: class, confidence, bbox.
        bgr_img:    Imagen BGR de OpenCV para cálculo de peso visual.
        image_id:   Identificador de la imagen.
        variedad:   Variedad de la fruta (puede ser None).

    Returns:
        Dict con métricas fenológicas, proyección financiera y cronograma.
    """
    etapa_counts:  dict[str, int]   = {}
    etapa_pesos:   dict[str, float] = {}
    peso_sano_total = 0.0
    total = sanos = enfermos = 0

    for det in detections:
        cls  = det["class"]
        info = CLASS_MAP.get(cls)
        if info is None:
            continue

        etapa = info["etapa"]
        etapa_counts[etapa] = etapa_counts.get(etapa, 0) + 1
        total += 1

        if info["sano"] and etapa in CLASES_CON_FRUTO:
            peso = calcular_peso_visual(bgr_img, det["bbox"])
            if peso is None:
                peso = info["peso_g"]
        else:
            peso = info["peso_g"]

        etapa_pesos[etapa] = etapa_pesos.get(etapa, 0.0) + peso

        if info["sano"]:
            sanos += 1
            peso_sano_total += peso
        else:
            enfermos += 1

    merma = round((enfermos / total * 100) if total > 0 else 0.0, 2)

    orden_etapas = ["boton", "flor", "verde", "naranja", "marron", "maduro", "deteccion_gen"]
    cronograma = []
    for etapa in orden_etapas:
        cantidad = etapa_counts.get(etapa, 0)
        if cantidad == 0:
            continue
        pred = DIAS_PREDICCION.get(etapa, {"cambio_a": "?", "en_dias": 0, "dias_para_cosecha": 0})
        cronograma.append({
            "etapa":    etapa,
            "cantidad": cantidad,
            "peso_estimado_gramos": round(etapa_pesos.get(etapa, 0.0), 2),
            "prediccion": {
                "cambio_a":          pred["cambio_a"],
                "en_dias":           pred["en_dias"],
                "dias_para_cosecha": pred["dias_para_cosecha"],
            },
        })

    return {
        "image_id":       image_id,
        "variedad":       variedad,
        "fecha_analisis": datetime.now(timezone.utc).isoformat(),
        "metricas_salud": {
            "total_elementos_detectados": total,
            "elementos_sanos":            sanos,
            "elementos_enfermos":         enfermos,
            "porcentaje_merma_general":   merma,
        },
        "proyeccion_financiera": {
            "peso_sano_gramos": round(peso_sano_total, 2),
        },
        "cronograma_fenologico": cronograma,
    }
