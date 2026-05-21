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

    Args:
        bgr_img:      Array BGR uint8 de OpenCV.
        return_debug: Si True, retorna (imagen, metadata_dict).

    Returns:
        np.ndarray si return_debug=False.
        tuple[np.ndarray, dict] si return_debug=True.
        El dict tiene keys: wb_applied, wb_skipped_reason, clahe_applied.
    """
    meta = {"wb_applied": False, "wb_skipped_reason": None, "clahe_applied": False}

    # Convert to LAB and extract color channels
    lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    # Apply Gray World White Balance to L channel
    l = _apply_gray_world_to_l(bgr_img, l, meta)

    # Apply CLAHE to L channel
    l = _apply_clahe_to_l(l, meta)

    # Reconstruct LAB with processed L and original a/b
    lab_result = cv2.merge([l, a, b])
    result_bgr = cv2.cvtColor(lab_result, cv2.COLOR_LAB2BGR)

    if return_debug:
        return result_bgr, meta
    return result_bgr


def _apply_gray_world_to_l(bgr_img: np.ndarray, l_channel: np.ndarray, meta: dict) -> np.ndarray:
    """Apply Gray World White Balance to L channel based on BGR image."""
    img_f = bgr_img.astype(np.float32)
    means = img_f.mean(axis=(0, 1))  # [mean_B, mean_G, mean_R]

    if (means < 1.0).any():
        meta["wb_skipped_reason"] = "low_mean_channel"
        return l_channel

    # Apply Gray World scaling: each channel scaled so all have equal mean
    global_mean = means.mean()
    scales = global_mean / means
    # For L channel in LAB, apply the minimum scale (to preserve the white balance effect)
    min_scale = np.min(scales)
    l_f = l_channel.astype(np.float32)
    l_corrected = np.clip(l_f * min_scale, 0, 255).astype(np.uint8)
    meta["wb_applied"] = True
    return l_corrected


def _apply_clahe_to_l(l_channel: np.ndarray, meta: dict) -> np.ndarray:
    """Apply CLAHE to L channel."""
    clahe = cv2.createCLAHE(
        clipLimit=_CLAHE_CLIP_LIMIT,
        tileGridSize=(_CLAHE_TILE_SIZE, _CLAHE_TILE_SIZE),
    )
    l_eq = clahe.apply(l_channel)
    meta["clahe_applied"] = True
    return l_eq
