import os

import cv2
import numpy as np

_CLAHE_CLIP_LIMIT = float(os.getenv("CLAHE_CLIP_LIMIT", "2.0"))
_CLAHE_TILE_SIZE  = int(os.getenv("CLAHE_TILE_SIZE", "8"))


def preprocess(
    bgr_img: np.ndarray,
    return_debug: bool = False,
) -> "np.ndarray | tuple[np.ndarray, dict]":
    """
    Aplica Gray World White Balance + CLAHE a una imagen BGR de OpenCV.

    Desactivado por defecto en main.py (ver ENABLE_COLOR_PREPROCESSING): el
    modelo se entrenó sin ninguna corrección determinista de color, y este
    preprocesado reducía las detecciones frente al pipeline de entrenamiento.
    Solo se invoca para pruebas A/B puntuales.

    Args:
        bgr_img:      Array BGR uint8 de OpenCV.
        return_debug: Si True, retorna (imagen, metadata_dict).

    Returns:
        np.ndarray si return_debug=False.
        tuple[np.ndarray, dict] si return_debug=True.
        El dict tiene keys: wb_applied, wb_skipped_reason, clahe_applied.
    """
    meta = {"wb_applied": False, "wb_skipped_reason": None, "clahe_applied": False}

    img = _apply_gray_world(bgr_img, meta)
    img = _apply_clahe(img, meta)

    if return_debug:
        return img, meta
    return img


def _apply_gray_world(bgr_img: np.ndarray, meta: dict) -> np.ndarray:
    img_f = bgr_img.astype(np.float32)
    means = img_f.mean(axis=(0, 1))  # [mean_B, mean_G, mean_R]

    if (means < 1.0).any():
        meta["wb_skipped_reason"] = "low_mean_channel"
        return bgr_img

    global_mean = means.mean()
    scale       = global_mean / means
    corrected   = np.clip(img_f * scale, 0, 255).astype(np.uint8)
    meta["wb_applied"] = True
    return corrected


def _apply_clahe(bgr_img: np.ndarray, meta: dict) -> np.ndarray:
    lab        = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
    l, a, b    = cv2.split(lab)
    clahe      = cv2.createCLAHE(
        clipLimit=_CLAHE_CLIP_LIMIT,
        tileGridSize=(_CLAHE_TILE_SIZE, _CLAHE_TILE_SIZE),
    )
    l_eq       = clahe.apply(l)
    lab_eq     = cv2.merge([l_eq, a, b])
    meta["clahe_applied"] = True
    return cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)
