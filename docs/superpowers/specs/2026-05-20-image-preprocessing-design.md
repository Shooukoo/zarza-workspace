# Image Preprocessing Pipeline — fruit-inference

**Plan relacionado:** [[2026-05-20-image-preprocessing]]

**Fecha:** 2026-05-20  
**Servicio afectado:** `fruit-inference`  
**Objetivo:** Mejorar las predicciones del modelo YOLOv8 (detecciones perdidas, clasificación errónea de etapa fenológica, falsos positivos) aplicando preprocesado de imágenes antes de la inferencia, sin reentrenar el modelo.

---

## Contexto

Las imágenes provienen de cámaras de teléfonos móviles en campo. Condiciones de captura:
- Distancia estandarizada a ~1 metro de la planta, encuadre frontal (objetivo futuro)
- Actualmente: luz completamente variable — sol directo, sombra, contraluz, cualquier hora del día
- La clasificación fenológica depende fuertemente del color: `verde → naranja → marron → maduro`

El modelo recibe actualmente la imagen cruda sin ningún preprocesado, lo que hace que dominantes de color por iluminación variable causen clasificaciones erróneas de etapa.

---

## Decisión de diseño

**Enfoque elegido:** Gray World White Balance + CLAHE sobre canal L (LAB).

Alternativas descartadas:
- Solo CLAHE: mejora contraste pero no corrige dominantes de color que causan confusión entre etapas
- Pipeline completo (WB + CLAHE + sharpening + gamma): más riesgo de artefactos, más difícil de diagnosticar regresiones

---

## Arquitectura

El cambio es local a `fruit-inference`. Sin modificaciones en `fruit-backend`, `fruit-ms`, ni `zarza_ai`. El contrato externo del endpoint `/analyze` no cambia.

### Flujo anterior

```
download_image_bytes → bytes_to_bgr          (para peso visual)
                     → run_inference(bytes)   (decode interno → YOLO)
```

Problema: imagen decodificada dos veces desde bytes originales; YOLO recibe imagen sin procesar.

### Flujo nuevo

```
download_image_bytes
  → bytes_to_bgr                  # única decodificación
  → preprocess(bgr)               # Gray World + CLAHE
  → bgr_preprocessed
      → run_inference(bgr_prep)   # YOLO recibe imagen preprocesada
      → build_report(bgr_prep)    # peso visual sobre misma imagen
```

Una sola decodificación. Consistencia entre lo que ve YOLO y lo que usa el cálculo de peso.

---

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `infrastructure/image_preprocessor.py` | **Nuevo** — lógica de preprocesado |
| `infrastructure/yolo_client.py` | `run_inference` acepta `np.ndarray` BGR en lugar de `bytes` |
| `main.py` | Orquesta el flujo unificado; fallback de error |

---

## Módulo `image_preprocessor.py`

### Interfaz pública

```python
def preprocess(
    bgr_img: np.ndarray,
    return_debug: bool = False,
) -> np.ndarray | tuple[np.ndarray, dict]:
    ...
```

Cuando `return_debug=False` (default): retorna solo `np.ndarray`.  
Cuando `return_debug=True`: retorna `(np.ndarray, metadata_dict)`.  
`main.py` llama con `return_debug=True` solo si `PREPROCESSING_DEBUG=true`.

### Paso 1 — Gray World White Balance

Escala cada canal BGR para que su media sea igual a la media global de la imagen:

```
mean_global = (mean_B + mean_G + mean_R) / 3
factor_canal = mean_global / mean_canal
canal_corregido = clip(canal * factor_canal, 0, 255)
```

**Guardrail:** si cualquier canal tiene media < 1.0 (imagen casi negra), se omite el balance de blancos y se registra la razón.

### Paso 2 — CLAHE sobre canal L (espacio LAB)

```
BGR → LAB
CLAHE aplicado solo al canal L
LAB → BGR
```

Parámetros (configurables vía variables de entorno):
- `CLAHE_CLIP_LIMIT` — default `2.0`
- `CLAHE_TILE_SIZE` — default `8` (tileGridSize = (8, 8))

---

## Manejo de errores

El preprocesado no puede romper el pipeline. Si `preprocess()` lanza cualquier excepción, `main.py` hace fallback a la imagen BGR original:

```python
try:
    bgr_preprocessed = preprocess(bgr_img)
except Exception as e:
    print(f"[preprocess] warning: preprocesado falló, usando imagen original. {e}")
    bgr_preprocessed = bgr_img
```

---

## Observabilidad (modo debug)

`preprocess()` retorna opcionalmente metadatos de diagnóstico:

```python
{
  "wb_applied": bool,
  "wb_skipped_reason": str | None,  # ej. "low_mean_channel"
  "clahe_applied": bool,
}
```

Cuando `PREPROCESSING_DEBUG=true`, el endpoint `/analyze` incluye estos metadatos bajo la key `debug_preprocessing` en el response. En producción la key no aparece.

---

## Variables de entorno nuevas

| Variable | Default | Descripción |
|----------|---------|-------------|
| `CLAHE_CLIP_LIMIT` | `2.0` | Límite de amplificación del contraste |
| `CLAHE_TILE_SIZE` | `8` | Tamaño de la cuadrícula CLAHE (NxN) |
| `PREPROCESSING_DEBUG` | `false` | Incluye metadatos de preprocesado en el response |

Agregar al `.env.example` de `fruit-inference`.

---

## Testing

### Unit tests — `infrastructure/image_preprocessor.py`

| Test | Propósito |
|------|-----------|
| Imagen negra (zeros) | Verifica que Gray World no lanza excepción, activa guardrail |
| Imagen con dominante roja fuerte | Verifica que el balance reduce la dominante roja |
| Imagen normal | Verifica shape y dtype de salida idénticos a entrada |
| CLAHE no altera canales de color | Verifica que solo el canal L de LAB fue modificado |

### Validación manual pre-deploy

Con 5-10 imágenes reales problemáticas del campo:
1. Activar `PREPROCESSING_DEBUG=true` y guardar imagen preprocesada temporalmente con `cv2.imwrite`
2. Comparar detecciones side-by-side: imagen original vs. preprocesada
3. Confirmar que los colores se ven naturales (no artificiales)
4. Ajustar `CLAHE_CLIP_LIMIT` o `CLAHE_TILE_SIZE` si es necesario antes del deploy

---

## Criterios de éxito

- Reducción visible de clasificaciones incorrectas de etapa en imágenes con contraluz o dominante de color fuerte
- Sin regresiones en imágenes bien iluminadas (el fallback garantiza que el peor caso es igual al estado actual)
- El endpoint `/analyze` mantiene el mismo schema de response
