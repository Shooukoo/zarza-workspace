# Cierre de hallazgos de seguridad de bajo riesgo (SEG-05, SEG-06, SEG-07) — Diseño

**Fecha:** 2026-07-08
**Alcance:** `fruit-backend` (cifrado `fcmToken`), `fruit-inference` (autenticación + validación de tamaño), `fruit-ms` (envío del header de autenticación hacia `fruit-inference`).

## Problema

La auditoría técnica del 2026-05-22 (`docs/2026-05-22-audit-estado-proyecto.md`) dejó tres hallazgos de severidad baja sin resolver:

- **SEG-05:** el campo `fcmToken` del usuario se guarda en texto plano en Postgres.
- **SEG-06:** `fruit-inference` no valida quién lo llama; depende solo de no estar expuesto a internet.
- **SEG-07:** `fruit-inference` descarga la imagen completa de R2 sin validar su tamaño antes, exponiendo el contenedor a un OOM.

Los tres son independientes entre sí, de bajo esfuerzo, y sirven como primeros tickets para alguien nuevo en el proyecto. Este documento cubre los tres en secciones separadas; se implementan y mergean en cualquier orden.

## Sección 1 — Cifrado del `fcmToken` (`fruit-backend`)

**Decisión de migración:** cifrado solo hacia adelante. Los tokens ya existentes en texto plano se siguen leyendo tal cual hasta que se sobrescriban naturalmente (la app Flutter re-registra el token FCM en cada arranque vía `PATCH /auth/fcm-token`). No hay script de backfill ni migración de Prisma.

**Nuevo puerto/adaptador**, siguiendo el mismo patrón hexagonal que `IHasherPort` / `BcryptHasher` (`fruit-backend/src/auth/ports/hasher.port.ts`, `.../infrastructure/adapters/bcrypt-hasher.adapter.ts`):

- `fruit-backend/src/auth/ports/crypto.port.ts`
  ```ts
  export const I_CRYPTO_PORT = Symbol('I_CRYPTO_PORT');
  export interface ICryptoPort {
    encrypt(plainText: string): string;
    decrypt(cipherText: string): string;
  }
  ```
- `fruit-backend/src/auth/infrastructure/adapters/aes-gcm-crypto.adapter.ts` — implementación con AES-256-GCM usando el módulo `crypto` nativo de Node (sin dependencia npm nueva).

**Clave:** env var `FCM_TOKEN_ENCRYPTION_KEY` (32 bytes, base64). Requerida: la app falla al arrancar si falta o no decodifica a 32 bytes, mismo patrón que `FcmService.onModuleInit` usa hoy para validar las credenciales de Firebase (`fruit-backend/src/fcm/fcm.service.ts`).

**Formato persistido:** `v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>`. El prefijo de versión permite distinguir un valor cifrado de uno legado en texto plano, y deja espacio para cambiar de algoritmo/clave en el futuro sin romper lectura de datos antiguos.

**Punto de aplicación — único: `PrismaUserRepository`** (`fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`):

- `saveFcmToken(userId, token)` → cifra `token` antes del `update`.
- `findFcmTokenById(userId)` → si el valor leído empieza con `v1:`, desencripta y devuelve el texto plano; si no, lo devuelve tal cual (legado).
- `clearFcmToken(userId)` → sin cambios (sigue seteando `null`).

Ningún otro punto del código cambia: `FcmService.sendToDevice`, `InternalNotifyController.sendAnalisisPush` y `SolicitudesService` siguen recibiendo el token ya en texto plano desde `findFcmTokenById`.

`InMemoryUserRepository` (doble de prueba) no se modifica — sigue guardando texto plano. Es un simulador de persistencia, no ejercita cifrado; el cifrado se prueba directamente sobre `AesGcmCrypto` y sobre `PrismaUserRepository`.

**Wiring:** registrar `ICryptoPort` → `AesGcmCrypto` en `AuthModule`, inyectar en `PrismaUserRepository`.

## Sección 2 — Autenticación en `fruit-inference` (SEG-06)

**Nueva dependencia FastAPI** en `fruit-inference/infrastructure/auth.py` (no existe hoy ningún middleware/`Depends` en el proyecto):

```python
def verify_inference_token(x_inference_token: str = Header(...)) -> None:
    expected = os.getenv("INFERENCE_AUTH_TOKEN", "")
    if not expected or not secrets.compare_digest(x_inference_token, expected):
        raise HTTPException(status_code=401, detail="Invalid inference token")
```

Comparación con `secrets.compare_digest` (constant-time) — una pequeña mejora sobre el patrón `!==` que usa hoy `InternalNotifyController` en `fruit-backend`; en Python no cuesta esfuerzo extra usarlo bien desde el inicio.

**Aplicado solo a `POST /analyze`**, vía `dependencies=[Depends(verify_inference_token)]` en el decorador de la ruta (`fruit-inference/main.py`). `GET /health` queda sin auth porque lo usa el healthcheck de Docker.

**Env var:** `INFERENCE_AUTH_TOKEN`, leída una vez a nivel de módulo en `main.py` (mismo estilo que `MODEL_PATH`, `R2_BUCKET`, `CONF_THRESHOLD`). Fail-fast: si está vacía o ausente al arrancar, la app lanza error en vez de arrancar desprotegida.

**Lado `fruit-ms`** (quien llama a `/analyze`):

- Agregar `INFERENCE_AUTH_TOKEN` a `fruit-ms/src/config/envs.ts` (`joi.string().required()`), exponer como `envs.inferenceAuthToken`.
- Enviar el header en la llamada axios de `fruit-ms/src/fruits/infrastructure/inference-http.adapter.ts` (línea del `httpService.post`):
  ```ts
  this.httpService.post<AnalysisResponseDto>(
    `${envs.inferenceUrl}/analyze`,
    { storage_key: storageKey, image_id: imageId },
    { timeout: 60_000, headers: { 'x-inference-token': envs.inferenceAuthToken } },
  )
  ```

`INFERENCE_AUTH_TOKEN` es un secreto **distinto** de `INTERNAL_NOTIFY_TOKEN` (fruit-backend): son fronteras de confianza diferentes (fruit-ms → fruit-inference vs. fruit-ms → fruit-backend), aunque el patrón de validación es el mismo.

**Documentación de env vars:**
- `fruit-inference/.env.example`: nueva sección `# Autenticación interna` con `INFERENCE_AUTH_TOKEN=`.
- `fruit-ms/.env.example`: no existe hoy — se crea con las variables ya requeridas por `envs.ts` (`RABBITMQ_URL`, `RABBITMQ_QUEUE`, `INFERENCE_URL`, `DATABASE_URL`, `BACKEND_URL`, `INTERNAL_NOTIFY_TOKEN`, `HEALTH_PORT`) más la nueva `INFERENCE_AUTH_TOKEN`.

## Sección 3 — Validación de tamaño antes de descargar de R2 (SEG-07)

**Nueva función** en `fruit-inference/infrastructure/r2_client.py`:

```python
def check_object_size(s3_client, bucket: str, storage_key: str, max_bytes: int) -> None:
    try:
        head = s3_client.head_object(Bucket=bucket, Key=storage_key)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"No se pudo verificar '{storage_key}': {exc}")
    if head["ContentLength"] > max_bytes:
        raise HTTPException(status_code=400, detail="Imagen excede el tamaño máximo permitido")
```

**Se llama desde el handler `POST /analyze`** en `main.py`, antes de `download_image_bytes`, para no traer a memoria un objeto que ya se sabe que excede el límite.

**Límite:** env var `MAX_IMAGE_SIZE_MB`, default `5` — igual al límite que `fruit-backend` ya aplica en el upload multipart (`fruit-backend/src/main.ts`, `fileSize: 5000000`).

**Fuera de alcance (a propósito):** `download_image_bytes` hoy atrapa cualquier excepción y la mapea siempre a 404, ocultando causas reales (ej. un 403 de permisos R2 se vería igual que "no encontrado"). Es una debilidad preexistente pero no relacionada con la validación de tamaño; no se toca en este ticket para mantenerlo acotado e independiente.

## Testing

| Sección | Qué probar |
|---|---|
| 1 — Cifrado fcmToken | Round-trip encrypt/decrypt de `AesGcmCrypto`. `PrismaUserRepository` (Prisma mockeado): token nuevo se persiste cifrado con prefijo `v1:`; token legado sin prefijo se lee tal cual; `clearFcmToken` sigue seteando `null`. |
| 2 — Auth fruit-inference | `verify_inference_token`: rechaza header ausente/incorrecto (401), acepta el correcto. `InferenceHttpAdapter`: el POST incluye el header `x-inference-token`. Referencia directa: `internal-notify.controller.spec.ts` ya cubre el mismo patrón de rechazo por token inválido. |
| 3 — Validación de tamaño | `check_object_size` con `head_object` mockeado: acepta por debajo del límite, rechaza (400) por encima, propaga 404 si el objeto no existe. |

## No incluido en este diseño

- Backfill/migración de tokens FCM existentes en texto plano.
- Corrección del manejo de excepciones amplio en `download_image_bytes` (preexistente, no relacionado).
- Rotación de `FCM_TOKEN_ENCRYPTION_KEY` o `INFERENCE_AUTH_TOKEN` — se documentan como secretos estáticos en env vars, igual que el resto de secretos del proyecto (`JWT_SECRET`, `INTERNAL_NOTIFY_TOKEN`).
