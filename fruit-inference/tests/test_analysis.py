"""
Tests de dominio para build_report — cobertura de detecciones individuales
(bbox + confidence) agregadas a la respuesta de análisis.
"""

import numpy as np
import pytest

from domain.analysis import build_report


@pytest.fixture
def bgr_img():
    return np.zeros((100, 100, 3), dtype=np.uint8)


def test_incluye_detecciones_con_clase_etapa_sano_confidence_y_bbox(bgr_img):
    detections = [
        {"class": "naranja", "confidence": 0.87, "bbox": (10, 20, 30, 40)},
    ]

    report = build_report(detections, bgr_img, "img-1", "regina")

    assert report["detecciones"] == [
        {
            "clase": "naranja",
            "etapa": "naranja",
            "sano": True,
            "confidence": 0.87,
            "bbox": (10, 20, 30, 40),
        }
    ]


def test_detecciones_descarta_clases_desconocidas_igual_que_el_resto_del_reporte(bgr_img):
    detections = [
        {"class": "verde", "confidence": 0.9, "bbox": (0, 0, 10, 10)},
        {"class": "maduro", "confidence": 0.95, "bbox": (10, 10, 20, 20)},
        {"class": "clase_desconocida", "confidence": 0.5, "bbox": (20, 20, 30, 30)},
    ]

    report = build_report(detections, bgr_img, "img-1", None)

    assert len(report["detecciones"]) == 2


def test_detecciones_vacio_cuando_no_hay_detecciones(bgr_img):
    report = build_report([], bgr_img, "img-1", None)

    assert report["detecciones"] == []


def test_clase_enfermo_cuenta_como_enfermo_sin_aportar_peso_sano(bgr_img):
    detections = [
        {"class": "enfermo", "confidence": 0.75, "bbox": (0, 0, 10, 10)},
    ]

    report = build_report(detections, bgr_img, "img-1", None)

    assert report["metricas_salud"]["elementos_enfermos"] == 1
    assert report["metricas_salud"]["elementos_sanos"] == 0
    assert report["proyeccion_financiera"]["peso_sano_gramos"] == 0.0
    assert report["detecciones"] == [
        {
            "clase": "enfermo",
            "etapa": "deteccion_gen",
            "sano": False,
            "confidence": 0.75,
            "bbox": (0, 0, 10, 10),
        }
    ]
