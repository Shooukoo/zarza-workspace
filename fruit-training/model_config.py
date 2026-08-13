"""
fruit-training — Copia sincronizada del mapeo de clases de fruit-inference.

IMPORTANTE: debe coincidir EXACTAMENTE (claves y orden) con
fruit-inference/model_config.py. tests/test_class_map_sync.py falla si se
desincronizan. No se introduce un paquete Python compartido nuevo — duplicar
con un test de consistencia es suficiente para el volumen de cambio esperado
en este mapeo.
"""

CLASS_MAP: dict[str, dict] = {
    "boton":      {"etapa": "boton",         "sano": True,  "peso_g": 0.1},
    "flor":       {"etapa": "flor",          "sano": True,  "peso_g": 0.2},
    "verde":      {"etapa": "verde",         "sano": True,  "peso_g": 1.8},
    "naranja":    {"etapa": "naranja",       "sano": True,  "peso_g": 3.5},
    "marron":     {"etapa": "marron",        "sano": True,  "peso_g": 4.5},
    "maduro":     {"etapa": "maduro",        "sano": True,  "peso_g": 6.0},
    "zarzamora":  {"etapa": "deteccion_gen", "sano": True,  "peso_g": 3.0},
    "enfermo":    {"etapa": "deteccion_gen", "sano": False, "peso_g": 0.0},
}

CLASS_NAMES: list[str] = list(CLASS_MAP.keys())
