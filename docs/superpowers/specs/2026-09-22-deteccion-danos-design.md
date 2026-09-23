# Detección de fruta enferma/dañada (página provisional) — Design

**Fecha:** 2026-09-22
**Estado:** Aprobado
**Alcance:** `fruit-inference`, `fruit-backend`, `zarza-web`, `docker-compose.yml`

## Objetivo

Página provisional en el panel web donde un ADMIN selecciona una foto de una zarzamora, la envía a procesar y ve si la fruta está sana, enferma o dañada según un segundo modelo de IA. Simple, pero debe funcionar de forma confiable de punta a punta.

## El modelo

- Origen: `/home/san/Descargas/modelo-dañadas/best.pt` (~3 MB).
- Tipo: **clasificación** YOLOv8n-cls (`task=classify`), `imgsz=224`. Devuelve una etiqueta para toda la imagen, sin bounding boxes.
- Clases (índice → clave): `0 antracnosis`, `1 botrytis`, `2 dano`, `3 fusarium`, `4 mildeo`, `5 roya`, `6 sano`, `7 verticillium`.

## Fuera de alcance (YAGNI)

- No se guarda nada: ni en Postgres, ni en R2, ni en RabbitMQ. Sin historial.
- Solo el rol ADMIN.
- No hay integración con el pipeline fenológico (`nueva_fruta`) ni con la app móvil.
- No hay reentrenamiento ni versionado de este modelo.

## Arquitectura

```
zarza-web (/deteccion-danos)
  └─ POST /api/v1/damage-classification  (multipart, cookie JWT, ADMIN)
       fruit-backend
         └─ POST {INFERENCE_URL}/classify-damage  (multipart, x-inference-token)
              fruit-inference (modelo damage.pt ya cargado en memoria)
```

Todo es síncrono y sin estado. El navegador no puede hablar directo con `fruit-inference`, porque solo existe en la red interna y exige un token. Por eso `fruit-backend` hace de proxy autenticado, reutilizando `INFERENCE_URL` e `INFERENCE_AUTH_TOKEN`, que ya existen en su `envs.ts`.

## 1. fruit-inference

### Archivo del modelo
- Se copia a `fruit-inference/damage.pt`. `*.pt` ya está en `.gitignore`, así que igual que `best.pt` hay que colocarlo a mano antes de levantar el stack. Esto se documenta en el README de `fruit-inference`.
- `docker-compose.yml` monta `./fruit-inference/damage.pt:/app/damage.pt:ro` en el servicio `fruit-inference`.
- Nueva env `DAMAGE_MODEL_PATH` (default `damage.pt`), agregada a `.env.example`.

### Carga
- En el `lifespan`, después de cargar el modelo fenológico: si `DAMAGE_MODEL_PATH` existe, se carga en `state["damage_model"]`. Si no existe o falla la carga, se registra un **warning** y `state["damage_model"] = None`. **El servicio arranca igual**; la ausencia de este modelo nunca afecta a `/analyze`.
- `/internal/prepare-restart` no necesita cambios: al reiniciar, el `lifespan` vuelve a cargar ambos modelos.

### Endpoint `POST /classify-damage`
- Dependencia: `verify_inference_token` (igual que `/analyze`).
- Entrada: `multipart/form-data` con el campo `file`. Requiere `python-multipart` en `requirements.txt` si todavía no está.
- Pasos:
  1. Si `state["damage_model"] is None` → **503** `{"detail": "Modelo de clasificación de daños no disponible"}`.
  2. Leer los bytes. Si superan `MAX_IMAGE_SIZE_BYTES` → **413**.
  3. Decodificar con PIL. Si falla → **400** `{"detail": "Imagen inválida"}`.
  4. Aplicar `ImageOps.exif_transpose` y convertir a RGB.
  5. `model.predict(pil_img, imgsz=224, verbose=False)`. Se usa el preprocesamiento de clasificación por defecto de Ultralytics, el mismo del entrenamiento. **No** se aplica el stretch a 640 ni el CLAHE del detector.
  6. Leer `results[0].probs.data` y armar la respuesta con todas las clases, ordenadas por confianza descendente.
- Respuesta 200:
  ```json
  {
    "clase": "botrytis",
    "confianza": 0.873,
    "probabilidades": [
      { "clase": "botrytis", "confianza": 0.873 },
      { "clase": "sano", "confianza": 0.051 }
    ]
  }
  ```
  `probabilidades` siempre trae las 8 clases; en el ejemplo solo se muestran dos. `confianza` va en el rango 0–1, y los nombres de clase salen de `model.names`, sin hardcodear.
- La lógica de inferencia vive en un módulo pequeño de infraestructura, `infrastructure/damage_classifier.py`, con dos funciones: `load_damage_model(path) -> model | None` y `classify(model, image_bytes) -> dict`. Así `main.py` queda delgado y la lógica se puede probar sola.

## 2. fruit-backend

### Módulo `damage-classification/`
- `damage-classification.module.ts`, `damage-classification.controller.ts`, `damage-classification.service.ts`, `damage-classification.types.ts`. Se registra en `AppModule`.
- Controller: `POST /api/v1/damage-classification`, con los guards JWT + roles y `@Roles(Role.ADMIN)`, igual que otros endpoints solo-ADMIN. Swagger: `@ApiConsumes('multipart/form-data')`.
- Validación de la imagen: se **reutilizan** el pipe multipart y el validador de imagen de `ingestion/` (magic bytes, mimetype permitido, tamaño máximo), exportándolos o importándolos según haga falta. No se duplica la lógica.
- Service: arma un `FormData` con el buffer (nombre de archivo y mimetype originales) y hace `POST` a `${envs.inferenceUrl}/classify-damage` con el header `x-inference-token: envs.inferenceAuthToken`, mediante `HttpService` y timeout de 30 s. Devuelve el JSON tal cual, tipado como `DamageClassificationResult`.
- Mapeo de errores:
  | Situación | Respuesta del backend |
  |---|---|
  | Inferencia responde 400 / 413 | 400 `BadRequestException` con el `detail` recibido |
  | Inferencia responde 503, timeout o conexión rechazada | 503 `ServiceUnavailableException("Servicio de clasificación no disponible")` |
  | Cualquier otro error | 502 `BadGatewayException` y log con `AppLogger` |

## 3. zarza-web

### Página `src/deteccion-danos/`
- `DeteccionDanosPage.tsx`: la página.
- `useClasificarDano.ts`: hook que hace el `POST` multipart con el `client` de axios existente y expone `{ clasificar, resultado, loading, error, reset }`.
- `clases.ts`: mapa de clave de clase a `{ etiqueta, color }`:
  | clave | etiqueta | color |
  |---|---|---|
  | sano | Sano | verde (success) |
  | dano | Daño | naranja (warning) |
  | antracnosis | Antracnosis | rojo (error) |
  | botrytis | Botrytis | rojo |
  | fusarium | Fusarium | rojo |
  | mildeo | Mildiú | rojo |
  | roya | Roya | rojo |
  | verticillium | Verticilosis | rojo |

  Una clave desconocida muestra la clave cruda en gris, sin romper la página.
- `types.ts`: `DamageClassificationResult`.

### Flujo de UI (antd)
1. `Upload.Dragger` con `accept="image/jpeg,image/png,image/webp"`, un solo archivo y `beforeUpload` devolviendo `false`, para que no suba nada automáticamente. Si el tipo o el tamaño son inválidos (más de 5 MB), se muestra un mensaje en el cliente.
2. Vista previa de la foto con `URL.createObjectURL`, revocada al cambiar de foto o desmontar.
3. Botón **Analizar**, deshabilitado si no hay foto y con `loading` mientras procesa.
4. Resultado junto a la foto:
   - Tarjeta principal con la etiqueta en español, un `Tag` del color correspondiente y la confianza como porcentaje con un decimal.
   - Lista de las 8 clases con `Progress` horizontal, en orden descendente.
5. Botón **Analizar otra foto**, que limpia foto, resultado y error.
6. Si hay error, `Alert type="error"` con el mensaje del backend, o uno genérico si no hay mensaje.

El layout respeta el tema claro/oscuro existente y es responsive, apilado en pantallas angostas.

### Ruteo y menú
- `App.tsx`: `<Route path="/deteccion-danos" element={<DeteccionDanosPage />} />` dentro del bloque `PrivateRoute allowedRoles={[Role.ADMIN]}`.
- `shared/AppShell.tsx`: item de menú `{ key: '/deteccion-danos', label: 'Detección de Daños (beta)', roles: [Role.ADMIN] }`.

## Pruebas

- **fruit-inference (pytest):** `tests/test_classify_damage.py`, con el modelo mockeado:
  - 200 con la respuesta ordenada y las 8 clases.
  - 400 con bytes que no son imagen.
  - 413 con imagen demasiado grande.
  - 401/403 sin token.
  - 503 con modelo ausente.
  - Además, un test de `load_damage_model` con una ruta inexistente, que debe devolver `None` sin lanzar.
- **fruit-backend (Jest):** `damage-classification.service.spec.ts`:
  - Reenvía el `FormData` con el token a la URL correcta.
  - Mapea 400 → 400, 503/ECONNREFUSED/timeout → 503 y otros → 502.
  - Controller spec: delega al service.
- **Verificación:** `tsc`, `build`, `lint` y `jest` en `fruit-backend`; `npm run build` en `zarza-web`; `pytest` en `fruit-inference`.
- **E2E manual:** stack Docker levantado, login como ADMIN, subir al menos una foto real de fruta sana y una de enferma o dañada, y confirmar el resultado, las barras y los mensajes de error (por ejemplo, subir un `.txt` renombrado a `.jpg`).
