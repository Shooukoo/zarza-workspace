"""
Configuración del mapeo de clases del modelo YOLO a etapas fenológicas y métricas.
Los nombres de clase deben coincidir EXACTAMENTE con las etiquetas del modelo entrenado.
"""

# Mapa de clases: nombre_clase → metadatos de etapa, salud y peso estimado en gramos
CLASS_MAP: dict[str, dict] = {
    "boton":      {"etapa": "boton",         "sano": True, "peso_g": 0.1},
    "flor":       {"etapa": "flor",          "sano": True, "peso_g": 0.2},
    "verde":      {"etapa": "verde",         "sano": True, "peso_g": 1.8},
    "naranja":    {"etapa": "naranja",       "sano": True, "peso_g": 3.5},
    "marron":     {"etapa": "marron",        "sano": True, "peso_g": 4.5},
    "maduro":     {"etapa": "maduro",        "sano": True, "peso_g": 6.0},
    "zarzamora":  {"etapa": "deteccion_gen", "sano": True, "peso_g": 3.0},
}

# Ciclo fenológico estándar para variedades Regina, Aketzali, Amelali y Erandi
DIAS_PREDICCION: dict[str, dict] = {
    "boton":         {"cambio_a": "flor",     "en_dias": 10, "dias_para_cosecha": 45},
    "flor":          {"cambio_a": "verde",    "en_dias": 7,  "dias_para_cosecha": 35},
    "verde":         {"cambio_a": "naranja",  "en_dias": 20, "dias_para_cosecha": 28},
    "naranja":       {"cambio_a": "marron",   "en_dias": 5,  "dias_para_cosecha": 8},
    "marron":        {"cambio_a": "maduro",   "en_dias": 3,  "dias_para_cosecha": 3},
    "maduro":        {"cambio_a": "cosecha",  "en_dias": 0,  "dias_para_cosecha": 0},
    "deteccion_gen": {"cambio_a": "cosecha",  "en_dias": 0,  "dias_para_cosecha": 0},
}

# Variedades soportadas (informativo, para validación futura)
VARIEDADES_SOPORTADAS = ["regina", "aketzali", "amelali", "erandi"]
