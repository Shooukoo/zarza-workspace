import cv2
import numpy as np
import pytest


def test_black_image_does_not_raise():
    """Gray World debe activar guardrail en imagen negra sin lanzar excepción."""
    from infrastructure.image_preprocessor import preprocess

    black = np.zeros((100, 100, 3), dtype=np.uint8)
    result, meta = preprocess(black, return_debug=True)

    assert result.shape == black.shape
    assert result.dtype == np.uint8
    assert meta["wb_applied"] is False
    assert meta["wb_skipped_reason"] == "low_mean_channel"
    assert meta["clahe_applied"] is True


def test_red_dominant_image_reduces_red_channel():
    """Gray World debe reducir el canal dominante rojo."""
    from infrastructure.image_preprocessor import preprocess

    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[:, :, 2] = 200  # Red (BGR index 2)
    img[:, :, 1] = 80   # Green
    img[:, :, 0] = 80   # Blue

    result, meta = preprocess(img, return_debug=True)

    assert meta["wb_applied"] is True
    assert result[:, :, 2].mean() < img[:, :, 2].mean()


def test_output_shape_and_dtype_preserved():
    """La imagen de salida debe tener el mismo shape y dtype que la entrada."""
    from infrastructure.image_preprocessor import preprocess

    img = np.random.randint(50, 200, (480, 640, 3), dtype=np.uint8)
    result = preprocess(img)

    assert result.shape == img.shape
    assert result.dtype == img.dtype


def test_clahe_does_not_alter_color_channels():
    """CLAHE solo debe modificar el canal L en espacio LAB, no a ni b."""
    from infrastructure.image_preprocessor import preprocess

    # Imagen con todos los canales iguales (Gray World es no-op: scale=1)
    img = np.full((100, 100, 3), 128, dtype=np.uint8)
    img[25:75, 25:75] = [60, 128, 128]  # variación en L, a y b equilibrados

    result, meta = preprocess(img, return_debug=True)

    assert meta["clahe_applied"] is True

    lab_before = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    lab_after  = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)

    # Canales a y b no deben cambiar
    np.testing.assert_array_equal(lab_before[:, :, 1], lab_after[:, :, 1])
    np.testing.assert_array_equal(lab_before[:, :, 2], lab_after[:, :, 2])
