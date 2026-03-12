"""
fruit-inference — Capa de dominio: cálculo de peso visual por visión computacional.

Responsabilidad: estimar el peso en gramos de un fruto a partir de su bounding box
usando técnicas de visión computacional (OpenCV). Sin dependencias de FastAPI ni boto3.
"""

import math
from typing import Optional

import cv2
import numpy as np

# ─────────────────────────────────────────────────────────────────────────────
# Rangos HSV para aislar fruta oscura / morada / rojiza
# ─────────────────────────────────────────────────────────────────────────────
_HSV_RANGES = [
    (np.array([0,   40,  0 ]), np.array([180, 255, 70 ])),  # muy oscuro con saturación
    (np.array([0,   50,  20]), np.array([15,  255, 130])),   # rojizos oscuros
    (np.array([120, 40,  20]), np.array([175, 255, 130])),   # morado/violeta oscuro
    (np.array([0,   20,  0 ]), np.array([180, 255, 45 ])),   # negros saturados
]
_HSV_GREEN_LOWER = np.array([25, 30, 30])
_HSV_GREEN_UPPER = np.array([95, 255, 255])
_MIN_CONTOUR_AREA = 10

# Densidad de la zarzamora (g/cm³)
DENSIDAD_FRUTA = 1.0
# Rango de peso biológicamente plausible (g)
PESO_MIN_G = 1.5
PESO_MAX_G = 13.0


def _crear_mascara_fruta(roi_bgr: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2HSV)
    mascara = np.zeros(hsv.shape[:2], dtype=np.uint8)
    for lower, upper in _HSV_RANGES:
        mascara = cv2.bitwise_or(mascara, cv2.inRange(hsv, lower, upper))

    mascara_verde = cv2.inRange(hsv, _HSV_GREEN_LOWER, _HSV_GREEN_UPPER)
    mascara_claro = cv2.inRange(hsv, np.array([0, 0, 180]), np.array([180, 60, 255]))
    mascara = cv2.bitwise_and(mascara, cv2.bitwise_not(mascara_verde))
    mascara = cv2.bitwise_and(mascara, cv2.bitwise_not(mascara_claro))

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, kernel, iterations=3)
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN,  kernel, iterations=1)
    return mascara


def _obtener_contorno_principal(mascara: np.ndarray) -> Optional[np.ndarray]:
    contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    validos = [c for c in contornos if cv2.contourArea(c) >= _MIN_CONTOUR_AREA]
    if not validos:
        return None
    return cv2.convexHull(max(validos, key=cv2.contourArea))


def _estimar_peso_esferoide(alto_cm: float, ancho_cm: float) -> float:
    """V = (4/3)π(ancho/2)²(alto/2) ; Peso = V × densidad"""
    r_ecuat  = ancho_cm / 2.0
    semi_pol = alto_cm  / 2.0
    volumen  = (4.0 / 3.0) * math.pi * (r_ecuat ** 2) * semi_pol
    return volumen * DENSIDAD_FRUTA


def calcular_peso_visual(
    bgr_img: np.ndarray,
    bbox: tuple[int, int, int, int],
) -> Optional[float]:
    """
    Calcula el peso en gramos de un fruto usando su bounding box y visión computacional.
    Retorna None si el contorno no es suficientemente bueno.
    """
    x1, y1, x2, y2 = bbox
    roi = bgr_img[y1:y2, x1:x2]
    if roi.size == 0:
        return None

    mascara  = _crear_mascara_fruta(roi)
    contorno = _obtener_contorno_principal(mascara)
    if contorno is None or len(contorno) < 5:
        return None

    _, (eje_a, eje_b), _ = cv2.fitEllipse(contorno)
    eje_mayor_px = max(eje_a, eje_b)
    eje_menor_px = min(eje_a, eje_b)

    if eje_menor_px <= 0:
        return None

    aspect_ratio = eje_mayor_px / eje_menor_px
    ref_height   = 2.4 + (aspect_ratio - 1.0) * 3.2
    ref_height   = max(2.2, min(4.5, ref_height))
    ppcm         = eje_mayor_px / ref_height

    alto_cm  = eje_mayor_px / ppcm
    ancho_cm = eje_menor_px / ppcm

    peso = _estimar_peso_esferoide(alto_cm, ancho_cm)
    peso = max(PESO_MIN_G, min(PESO_MAX_G, peso))
    return round(peso, 2)
