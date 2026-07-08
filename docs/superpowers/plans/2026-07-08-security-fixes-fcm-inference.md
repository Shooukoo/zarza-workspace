# Cierre de hallazgos de seguridad SEG-05/06/07 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar tres hallazgos de seguridad de bajo riesgo de la auditoría del 2026-05-22: cifrar el `fcmToken` en `fruit-backend` (SEG-05), autenticar las llamadas a `fruit-inference` (SEG-06), y validar el tamaño de la imagen antes de descargarla de R2 en `fruit-inference` (SEG-07).

**Architecture:** Tres grupos de tareas totalmente independientes, mergeables en cualquier orden:
- **Grupo A** (`fruit-backend`): nuevo puerto/adaptador `ICryptoPort`/`AesGcmCrypto` (AES-256-GCM, `crypto` nativo de Node), aplicado solo dentro de `PrismaUserRepository`.
- **Grupo B** (`fruit-inference` + `fruit-ms`): nueva dependencia FastAPI que valida un header compartido, aplicada solo a `POST /analyze`; `fruit-ms` empieza a enviar ese header.
- **Grupo C** (`fruit-inference`): nueva función que usa `HeadObject` para verificar el tamaño del objeto en R2 antes de descargarlo, llamada desde `POST /analyze`.

**Tech Stack:** NestJS 11 + TypeScript + Jest (`fruit-backend`, `fruit-ms`), Python 3 + FastAPI + pytest (`fruit-inference`). Sin dependencias nuevas: Node usa el módulo `crypto` nativo, Python usa `secrets`/`unittest.mock` de la stdlib.

**Spec:** `docs/superpowers/specs/2026-07-08-security-fixes-fcm-inference-design.md`

## Global Constraints

- Sin dependencias npm/pip nuevas: cifrado con `crypto` nativo de Node; comparación de tokens con `secrets.compare_digest` de Python; mocks de tests con `unittest.mock` (Python) y `jest.fn()` (TS) — nada de `moto`, `httpx`/`TestClient`, ni librerías de cifrado externas.
- Formato de token cifrado persistido: `v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>`. Un valor sin el prefijo `v1:` se trata como texto plano legado.
- Sin migración/backfill de datos existentes — los tokens FCM en texto plano se cifran solo cuando se vuelven a guardar.
- Límite de tamaño de imagen: `MAX_IMAGE_SIZE_MB` con default `5` (igual al límite de 5MB que `fruit-backend` ya aplica en el upload multipart).
- Fail-fast: cualquier env var nueva y requerida (`FCM_TOKEN_ENCRYPTION_KEY`, `INFERENCE_AUTH_TOKEN`) debe hacer fallar el arranque del servicio si falta o es inválida — nunca arrancar en un estado desprotegido.
- No se toca el manejo de excepciones existente en `download_image_bytes` (mapea todo a 404) — es una debilidad preexistente no relacionada, fuera de alcance de este plan.
- Nota de coordinación: los Grupos B y C modifican `fruit-inference/main.py` en puntos distintos (decorador de la ruta vs. primera línea del handler). Si se implementan en paralelo, el merge es trivial pero hay que resolverlo a mano.

---

## Grupo A — Cifrado del `fcmToken` (`fruit-backend`)

### Task A1: Puerto y adaptador de cifrado — `ICryptoPort` / `AesGcmCrypto`

**Files:**
- Create: `fruit-backend/src/auth/ports/crypto.port.ts`
- Create: `fruit-backend/src/auth/infrastructure/adapters/aes-gcm-crypto.adapter.ts`
- Test: `fruit-backend/src/auth/infrastructure/adapters/aes-gcm-crypto.adapter.spec.ts`
- Modify: `fruit-backend/src/config/envs.ts`
- Modify: `fruit-backend/.env.example`

**Interfaces:**
- Produces: `I_CRYPTO_PORT` (Symbol), `ICryptoPort { encrypt(plainText: string): string; decrypt(cipherText: string): string }`, clase `AesGcmCrypto implements ICryptoPort` (sin dependencias de constructor — lee `process.env.FCM_TOKEN_ENCRYPTION_KEY` directamente, mismo estilo que `BcryptHasher`). `envs.fcmTokenEncryptionKey: string`.

- [ ] **Step 1: Añadir `FCM_TOKEN_ENCRYPTION_KEY` a `envs.ts`**

En `fruit-backend/src/config/envs.ts`, añadir al `interface EnvVars` (después de `INTERNAL_NOTIFY_TOKEN: string;`):

```ts
  FCM_TOKEN_ENCRYPTION_KEY: string;
```

Añadir al `envSchema` (después de `INTERNAL_NOTIFY_TOKEN: joi.string().min(32).required(),`):

```ts
    FCM_TOKEN_ENCRYPTION_KEY: joi
      .string()
      .required()
      .custom((value: string, helpers: joi.CustomHelpers) => {
        if (Buffer.from(value, 'base64').length !== 32) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'clave base64 de 32 bytes'),
```

Añadir al export `envs` (después de `internalNotifyToken: envVars.INTERNAL_NOTIFY_TOKEN,`):

```ts
  fcmTokenEncryptionKey: envVars.FCM_TOKEN_ENCRYPTION_KEY,
```

- [ ] **Step 2: Documentar la variable en `.env.example`**

En `fruit-backend/.env.example`, añadir al final:

```
# Cifrado de datos sensibles
# Clave AES-256 en base64 (debe decodificar a exactamente 32 bytes).
# Generar con: openssl rand -base64 32
FCM_TOKEN_ENCRYPTION_KEY=
```

- [ ] **Step 3: Escribir el test que falla para `AesGcmCrypto`**

Crear `fruit-backend/src/auth/infrastructure/adapters/aes-gcm-crypto.adapter.spec.ts`:

```ts
import { randomBytes } from 'crypto';
import { AesGcmCrypto } from './aes-gcm-crypto.adapter';

describe('AesGcmCrypto', () => {
  const ORIGINAL_ENV = process.env.FCM_TOKEN_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = ORIGINAL_ENV;
  });

  it('encrypt() produce un valor prefijado con v1: distinto del original', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const crypto = new AesGcmCrypto();

    const encrypted = crypto.encrypt('token-de-prueba');

    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted).not.toBe('token-de-prueba');
  });

  it('decrypt(encrypt(x)) devuelve x', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const crypto = new AesGcmCrypto();

    const encrypted = crypto.encrypt('mi-token-fcm-12345');

    expect(crypto.decrypt(encrypted)).toBe('mi-token-fcm-12345');
  });

  it('decrypt() de un valor legado sin prefijo v1: lo devuelve tal cual', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const crypto = new AesGcmCrypto();

    expect(crypto.decrypt('token-legado-en-texto-plano')).toBe(
      'token-legado-en-texto-plano',
    );
  });

  it('dos cifrados del mismo texto producen resultados distintos (IV aleatorio)', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const crypto = new AesGcmCrypto();

    const a = crypto.encrypt('mismo-texto');
    const b = crypto.encrypt('mismo-texto');

    expect(a).not.toBe(b);
  });

  it('el constructor lanza si falta FCM_TOKEN_ENCRYPTION_KEY', () => {
    delete process.env.FCM_TOKEN_ENCRYPTION_KEY;

    expect(() => new AesGcmCrypto()).toThrow('FCM_TOKEN_ENCRYPTION_KEY');
  });

  it('el constructor lanza si la clave no decodifica a 32 bytes', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = Buffer.from('muy-corta').toString('base64');

    expect(() => new AesGcmCrypto()).toThrow('32 bytes');
  });
});
```

- [ ] **Step 4: Confirmar que el test falla**

```bash
cd fruit-backend && pnpm test -- aes-gcm-crypto.adapter.spec.ts
```

Expected: FAIL — `Cannot find module './aes-gcm-crypto.adapter'`.

- [ ] **Step 5: Crear el puerto `ICryptoPort`**

Crear `fruit-backend/src/auth/ports/crypto.port.ts`:

```ts
export const I_CRYPTO_PORT = Symbol('I_CRYPTO_PORT');

export interface ICryptoPort {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}
```

- [ ] **Step 6: Implementar `AesGcmCrypto`**

Crear `fruit-backend/src/auth/infrastructure/adapters/aes-gcm-crypto.adapter.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ICryptoPort } from '../../ports/crypto.port';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const VERSION_PREFIX = 'v1';

@Injectable()
export class AesGcmCrypto implements ICryptoPort {
  private readonly key: Buffer;

  constructor() {
    const b64 = process.env.FCM_TOKEN_ENCRYPTION_KEY;
    if (!b64) {
      throw new Error('FCM_TOKEN_ENCRYPTION_KEY env var is required');
    }
    this.key = Buffer.from(b64, 'base64');
    if (this.key.length !== 32) {
      throw new Error('FCM_TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
    }
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      VERSION_PREFIX,
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
      // Valor legado (texto plano de antes del cifrado) — se devuelve tal cual.
      return cipherText;
    }
    const [, ivB64, authTagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString('utf8');
  }
}
```

- [ ] **Step 7: Confirmar que el test pasa**

```bash
cd fruit-backend && pnpm test -- aes-gcm-crypto.adapter.spec.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 8: Commit**

```bash
git add fruit-backend/src/auth/ports/crypto.port.ts \
        fruit-backend/src/auth/infrastructure/adapters/aes-gcm-crypto.adapter.ts \
        fruit-backend/src/auth/infrastructure/adapters/aes-gcm-crypto.adapter.spec.ts \
        fruit-backend/src/config/envs.ts \
        fruit-backend/.env.example
git commit -m "feat(auth): puerto ICryptoPort y adaptador AES-256-GCM para cifrar datos sensibles"
```

---

### Task A2: Cifrar el `fcmToken` en `PrismaUserRepository`

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`
- Modify: `fruit-backend/src/auth/infrastructure/auth.module.ts`
- Test: `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.spec.ts`

**Interfaces:**
- Consumes: `I_CRYPTO_PORT`, `ICryptoPort`, `AesGcmCrypto` (Task A1).
- Produces: `PrismaUserRepository.saveFcmToken`/`findFcmTokenById` cifran/descifran de forma transparente — ningún otro consumidor (`FcmService`, `InternalNotifyController`, `SolicitudesService`) cambia.

- [ ] **Step 1: Escribir el test que falla**

Crear `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.spec.ts`:

```ts
import { randomBytes } from 'crypto';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@rubus/database';
import { PrismaUserRepository } from './prisma-user.repository';
import { I_CRYPTO_PORT } from '../../ports/crypto.port';
import { AesGcmCrypto } from './aes-gcm-crypto.adapter';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('PrismaUserRepository — cifrado de fcmToken', () => {
  let repo: PrismaUserRepository;

  beforeEach(async () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        PrismaUserRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: I_CRYPTO_PORT, useClass: AesGcmCrypto },
      ],
    }).compile();
    repo = module.get(PrismaUserRepository);
  });

  it('saveFcmToken persiste el token cifrado, no en texto plano', async () => {
    mockPrisma.user.update.mockResolvedValue({});

    await repo.saveFcmToken('user-1', 'raw-fcm-token');

    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'user-1' });
    expect(call.data.fcmToken).not.toBe('raw-fcm-token');
    expect((call.data.fcmToken as string).startsWith('v1:')).toBe(true);
  });

  it('findFcmTokenById desencripta un token guardado cifrado', async () => {
    mockPrisma.user.update.mockResolvedValue({});
    await repo.saveFcmToken('user-1', 'raw-fcm-token');
    const encrypted = mockPrisma.user.update.mock.calls[0][0].data.fcmToken;
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: encrypted });

    const result = await repo.findFcmTokenById('user-1');

    expect(result).toBe('raw-fcm-token');
  });

  it('findFcmTokenById devuelve un token legado en texto plano tal cual', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: 'token-legado-plano' });

    const result = await repo.findFcmTokenById('user-1');

    expect(result).toBe('token-legado-plano');
  });

  it('findFcmTokenById devuelve null si el usuario no tiene token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: null });

    expect(await repo.findFcmTokenById('user-1')).toBeNull();
  });
});
```

- [ ] **Step 2: Confirmar que el test falla**

```bash
cd fruit-backend && pnpm test -- prisma-user.repository.spec.ts
```

Expected: FAIL — `Nest can't resolve dependencies of PrismaUserRepository` (falta `I_CRYPTO_PORT` en el constructor) o el token persistido no está cifrado.

- [ ] **Step 3: Inyectar `ICryptoPort` en `PrismaUserRepository` y cifrar/descifrar**

En `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`, cambiar el import de `@nestjs/common`:

```ts
import { Inject, Injectable } from '@nestjs/common';
```

Añadir el import del puerto (después de los imports existentes):

```ts
import { I_CRYPTO_PORT, type ICryptoPort } from '../../ports/crypto.port';
```

Reemplazar el constructor:

```ts
  constructor(
    private readonly prisma: PrismaService,
    @Inject(I_CRYPTO_PORT) private readonly crypto: ICryptoPort,
  ) {}
```

Reemplazar `findFcmTokenById` y `saveFcmToken`:

```ts
  async findFcmTokenById(userId: string): Promise<string | null> {
    const doc = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    if (!doc?.fcmToken) return null;
    return this.crypto.decrypt(doc.fcmToken);
  }

  async clearFcmToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
  }

  async saveFcmToken(userId: string, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: this.crypto.encrypt(token) },
    });
  }
```

(`clearFcmToken` queda igual — se incluye arriba solo para ubicar el bloque correcto en el archivo.)

- [ ] **Step 4: Registrar `I_CRYPTO_PORT` en `AuthModule`**

En `fruit-backend/src/auth/infrastructure/auth.module.ts`, añadir los imports:

```ts
import { I_CRYPTO_PORT } from '../ports/crypto.port';
import { AesGcmCrypto } from './adapters/aes-gcm-crypto.adapter';
```

Añadir al array `providers` (junto a `I_HASHER_PORT`):

```ts
    { provide: I_CRYPTO_PORT, useClass: AesGcmCrypto },
```

- [ ] **Step 5: Confirmar que el test pasa**

```bash
cd fruit-backend && pnpm test -- prisma-user.repository.spec.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 6: Confirmar que el resto de la suite de `fruit-backend` sigue pasando**

```bash
cd fruit-backend && pnpm test
```

Expected: PASS (sin regresiones en `internal-notify.controller.spec.ts`, `solicitudes.service.spec.ts`, etc. — todos mockean `IUserRepository`/`findFcmTokenById` directamente, no `PrismaUserRepository`).

- [ ] **Step 7: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts \
        fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.spec.ts \
        fruit-backend/src/auth/infrastructure/auth.module.ts
git commit -m "feat(auth): cifrar fcmToken con AES-256-GCM al persistir en PrismaUserRepository"
```

---

## Grupo B — Autenticación en `fruit-inference` (`fruit-inference` + `fruit-ms`)

### Task B1: Dependencia FastAPI `verify_inference_token`

**Files:**
- Create: `fruit-inference/infrastructure/auth.py`
- Test: `fruit-inference/tests/test_auth.py`

**Interfaces:**
- Produces: `verify_inference_token(x_inference_token: str = Header(...)) -> None` — lanza `HTTPException(401)` si el header no coincide con `INFERENCE_AUTH_TOKEN`. El módulo lanza `RuntimeError` al importarse si `INFERENCE_AUTH_TOKEN` no está seteada (fail-fast).

- [ ] **Step 1: Escribir el test que falla**

Crear `fruit-inference/tests/test_auth.py`:

```python
import importlib

import pytest
from fastapi import HTTPException


def _reload_auth_module():
    from infrastructure import auth as auth_module
    importlib.reload(auth_module)
    return auth_module


def test_raises_at_import_if_token_missing(monkeypatch):
    monkeypatch.delenv("INFERENCE_AUTH_TOKEN", raising=False)

    with pytest.raises(RuntimeError):
        _reload_auth_module()


def test_rejects_wrong_token(monkeypatch):
    monkeypatch.setenv("INFERENCE_AUTH_TOKEN", "correct-token")
    auth_module = _reload_auth_module()

    with pytest.raises(HTTPException) as exc_info:
        auth_module.verify_inference_token(x_inference_token="wrong-token")
    assert exc_info.value.status_code == 401


def test_accepts_correct_token(monkeypatch):
    monkeypatch.setenv("INFERENCE_AUTH_TOKEN", "correct-token")
    auth_module = _reload_auth_module()

    assert auth_module.verify_inference_token(x_inference_token="correct-token") is None
```

- [ ] **Step 2: Confirmar que el test falla**

```bash
cd fruit-inference && python -m pytest tests/test_auth.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'infrastructure.auth'`.

- [ ] **Step 3: Implementar `infrastructure/auth.py`**

Crear `fruit-inference/infrastructure/auth.py`:

```python
"""
fruit-inference — Infraestructura: autenticación por token compartido.

Responsabilidad: validar que las llamadas a /analyze incluyan el header
x-inference-token con el valor esperado (INFERENCE_AUTH_TOKEN).
"""

import os
import secrets

from fastapi import Header, HTTPException

INFERENCE_AUTH_TOKEN = os.getenv("INFERENCE_AUTH_TOKEN", "")

if not INFERENCE_AUTH_TOKEN:
    raise RuntimeError("INFERENCE_AUTH_TOKEN env var is required")


def verify_inference_token(x_inference_token: str = Header(...)) -> None:
    """Lanza 401 si el header x-inference-token no coincide con el esperado."""
    if not secrets.compare_digest(x_inference_token, INFERENCE_AUTH_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid inference token")
```

- [ ] **Step 4: Confirmar que el test pasa**

```bash
cd fruit-inference && python -m pytest tests/test_auth.py -v
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add fruit-inference/infrastructure/auth.py fruit-inference/tests/test_auth.py
git commit -m "feat(inference): dependencia FastAPI para validar header x-inference-token"
```

---

### Task B2: Aplicar la autenticación a `POST /analyze`

**Files:**
- Modify: `fruit-inference/main.py`
- Modify: `fruit-inference/.env.example`

**Interfaces:**
- Consumes: `verify_inference_token` (Task B1).
- Produces: `POST /analyze` responde 401 sin el header `x-inference-token` correcto. `GET /health` no cambia (sigue sin auth).

- [ ] **Step 1: Importar y aplicar la dependencia en `main.py`**

En `fruit-inference/main.py`, cambiar el import de FastAPI:

```python
from fastapi import Depends, FastAPI, HTTPException
```

Añadir el import de la dependencia (junto a los demás imports de `infrastructure`):

```python
from infrastructure.auth import verify_inference_token
```

Cambiar el decorador de la ruta `/analyze`:

```python
@app.post("/analyze", dependencies=[Depends(verify_inference_token)])
def analyze(req: AnalyzeRequest):
```

- [ ] **Step 2: Documentar la variable en `.env.example`**

En `fruit-inference/.env.example`, añadir al final:

```
# Autenticación interna
# Token compartido que fruit-ms debe enviar en el header x-inference-token
INFERENCE_AUTH_TOKEN=
```

- [ ] **Step 3: Verificar que la app arranca correctamente con la wiring nueva**

```bash
cd fruit-inference && INFERENCE_AUTH_TOKEN=test-token python -c "from main import app; print('OK', [r.path for r in app.routes])"
```

Expected: imprime `OK` y la lista de rutas (`/health`, `/analyze`) sin errores. (Importar `main` no dispara el `lifespan` — el modelo YOLO no se carga en este chequeo.)

- [ ] **Step 4: Verificar que sin la env var, la app falla al importarse**

```bash
cd fruit-inference && python -c "from main import app"
```

Expected: `RuntimeError: INFERENCE_AUTH_TOKEN env var is required`.

- [ ] **Step 5: Commit**

```bash
git add fruit-inference/main.py fruit-inference/.env.example
git commit -m "feat(inference): exigir header x-inference-token en POST /analyze"
```

---

### Task B3: `fruit-ms` envía el header `x-inference-token`

**Files:**
- Modify: `fruit-ms/src/config/envs.ts`
- Create: `fruit-ms/.env.example`
- Modify: `fruit-ms/src/fruits/infrastructure/inference-http.adapter.ts`
- Test: `fruit-ms/src/fruits/infrastructure/inference-http.adapter.spec.ts`

**Interfaces:**
- Consumes: nombre del header `x-inference-token` (contrato acordado con Task B1/B2).
- Produces: `envs.inferenceAuthToken: string`. `InferenceHttpAdapter.analyze(...)` envía el header en cada llamada a `POST /analyze`.

- [ ] **Step 1: Añadir `INFERENCE_AUTH_TOKEN` a `envs.ts`**

En `fruit-ms/src/config/envs.ts`, añadir al `interface EnvVars` (después de `INFERENCE_URL: string;`):

```ts
  INFERENCE_AUTH_TOKEN:   string;
```

Añadir al `envSchema` (después de `INFERENCE_URL: joi.string().uri().required(),`):

```ts
    INFERENCE_AUTH_TOKEN:   joi.string().required(),
```

Añadir al export `envs` (después de `inferenceUrl: envVars.INFERENCE_URL,`):

```ts
  inferenceAuthToken:   envVars.INFERENCE_AUTH_TOKEN,
```

- [ ] **Step 2: Crear `fruit-ms/.env.example`**

Crear `fruit-ms/.env.example` (no existe hoy):

```
# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE=ingestion_queue

# Base de datos (compartida con fruit-backend)
DATABASE_URL=postgresql://user:password@localhost:5432/zarza

# fruit-inference
INFERENCE_URL=http://fruit-inference:8000
INFERENCE_AUTH_TOKEN=

# fruit-backend (notificaciones internas)
BACKEND_URL=http://fruit-backend:3000
INTERNAL_NOTIFY_TOKEN=

# Health check
HEALTH_PORT=3002
```

- [ ] **Step 3: Escribir el test que falla**

Crear `fruit-ms/src/fruits/infrastructure/inference-http.adapter.spec.ts`:

```ts
import { of } from 'rxjs';
import { InferenceHttpAdapter } from './inference-http.adapter';
import { AnalysisResponseDto } from '../dto/analysis-response.dto';
import type { UserSnapshot } from '../domain/analysis.entity';

jest.mock('../../config/envs', () => ({
  envs: {
    inferenceUrl: 'http://fruit-inference:8000',
    inferenceAuthToken: 'test-inference-token',
  },
}));

describe('InferenceHttpAdapter', () => {
  let httpService: { post: jest.Mock };
  let adapter: InferenceHttpAdapter;

  const requester: UserSnapshot = { userId: 'u1', email: 'a@a.com' };

  const validResponse: AnalysisResponseDto = {
    image_id: 'img-1',
    variedad: null,
    fecha_analisis: '2026-07-08T00:00:00.000Z',
    metricas_salud: {
      total_elementos_detectados: 1,
      elementos_sanos: 1,
      elementos_enfermos: 0,
      porcentaje_merma_general: 0,
    },
    proyeccion_financiera: { peso_sano_gramos: 100 },
    cronograma_fenologico: [],
  };

  beforeEach(() => {
    httpService = { post: jest.fn() };
    adapter = new InferenceHttpAdapter(httpService as any);
  });

  it('envía el header x-inference-token en la llamada a /analyze', async () => {
    httpService.post.mockReturnValue(of({ data: validResponse }));

    await adapter.analyze('img-1', 'storage-key-1', requester);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://fruit-inference:8000/analyze',
      { storage_key: 'storage-key-1', image_id: 'img-1' },
      {
        timeout: 60_000,
        headers: { 'x-inference-token': 'test-inference-token' },
      },
    );
  });
});
```

- [ ] **Step 4: Confirmar que el test falla**

```bash
cd fruit-ms && pnpm test -- inference-http.adapter.spec.ts
```

Expected: FAIL — el mock de `httpService.post` recibe solo `{ timeout: 60_000 }` como tercer argumento, sin `headers`.

- [ ] **Step 5: Enviar el header en `InferenceHttpAdapter`**

En `fruit-ms/src/fruits/infrastructure/inference-http.adapter.ts`, reemplazar la llamada `this.httpService.post(...)`:

```ts
      const response = await firstValueFrom(
        this.httpService.post<AnalysisResponseDto>(
          `${envs.inferenceUrl}/analyze`,
          { storage_key: storageKey, image_id: imageId },
          {
            timeout: 60_000,
            headers: { 'x-inference-token': envs.inferenceAuthToken },
          },
        ),
      );
```

- [ ] **Step 6: Confirmar que el test pasa**

```bash
cd fruit-ms && pnpm test -- inference-http.adapter.spec.ts
```

Expected: PASS — 1 test.

- [ ] **Step 7: Commit**

```bash
git add fruit-ms/src/config/envs.ts \
        fruit-ms/.env.example \
        fruit-ms/src/fruits/infrastructure/inference-http.adapter.ts \
        fruit-ms/src/fruits/infrastructure/inference-http.adapter.spec.ts
git commit -m "feat(fruit-ms): enviar header x-inference-token al llamar a fruit-inference"
```

---

## Grupo C — Validación de tamaño antes de descargar de R2 (`fruit-inference`)

### Task C1: `check_object_size` en `r2_client.py`

**Files:**
- Modify: `fruit-inference/infrastructure/r2_client.py`
- Test: `fruit-inference/tests/test_r2_client.py`

**Interfaces:**
- Produces: `check_object_size(s3_client, bucket: str, storage_key: str, max_bytes: int) -> None` — lanza `HTTPException(400)` si el objeto excede `max_bytes`, `HTTPException(404)` si `head_object` falla.

- [ ] **Step 1: Escribir el test que falla**

Crear `fruit-inference/tests/test_r2_client.py`:

```python
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from infrastructure.r2_client import check_object_size


def test_check_object_size_passes_when_under_limit():
    s3 = MagicMock()
    s3.head_object.return_value = {"ContentLength": 1_000_000}

    check_object_size(s3, "bucket", "key", max_bytes=5_000_000)

    s3.head_object.assert_called_once_with(Bucket="bucket", Key="key")


def test_check_object_size_rejects_when_over_limit():
    s3 = MagicMock()
    s3.head_object.return_value = {"ContentLength": 10_000_000}

    with pytest.raises(HTTPException) as exc_info:
        check_object_size(s3, "bucket", "key", max_bytes=5_000_000)

    assert exc_info.value.status_code == 400


def test_check_object_size_raises_404_when_object_missing():
    s3 = MagicMock()
    s3.head_object.side_effect = Exception("NoSuchKey")

    with pytest.raises(HTTPException) as exc_info:
        check_object_size(s3, "bucket", "key", max_bytes=5_000_000)

    assert exc_info.value.status_code == 404
```

- [ ] **Step 2: Confirmar que el test falla**

```bash
cd fruit-inference && python -m pytest tests/test_r2_client.py -v
```

Expected: FAIL — `ImportError: cannot import name 'check_object_size'`.

- [ ] **Step 3: Implementar `check_object_size`**

En `fruit-inference/infrastructure/r2_client.py`, añadir la función entre `create_r2_client` y `download_image_bytes`:

```python
def check_object_size(s3_client, bucket: str, storage_key: str, max_bytes: int) -> None:
    """
    Verifica el tamaño del objeto en R2 antes de descargarlo, sin traerlo a memoria.

    Raises:
        HTTPException 404 si el objeto no existe o no se puede verificar.
        HTTPException 400 si el tamaño excede max_bytes.
    """
    try:
        head = s3_client.head_object(Bucket=bucket, Key=storage_key)
    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=f"No se pudo verificar la imagen '{storage_key}': {exc}",
        )
    if head["ContentLength"] > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=(
                f"La imagen '{storage_key}' excede el tamaño máximo permitido "
                f"({max_bytes} bytes)"
            ),
        )
```

- [ ] **Step 4: Confirmar que el test pasa**

```bash
cd fruit-inference && python -m pytest tests/test_r2_client.py -v
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add fruit-inference/infrastructure/r2_client.py fruit-inference/tests/test_r2_client.py
git commit -m "feat(inference): check_object_size verifica tamaño en R2 vía HeadObject"
```

---

### Task C2: Aplicar la validación de tamaño en `POST /analyze`

**Files:**
- Modify: `fruit-inference/main.py`
- Modify: `fruit-inference/.env.example`

**Interfaces:**
- Consumes: `check_object_size` (Task C1).
- Produces: `POST /analyze` responde 400 si la imagen en R2 excede `MAX_IMAGE_SIZE_MB` (default 5), antes de descargarla.

- [ ] **Step 1: Añadir `MAX_IMAGE_SIZE_MB` y llamar a `check_object_size` en `main.py`**

En `fruit-inference/main.py`, cambiar el import de `r2_client`:

```python
from infrastructure.r2_client import create_r2_client, download_image_bytes, check_object_size
```

Añadir la constante junto a las demás (después de `PREPROCESSING_DEBUG = ...`):

```python
MAX_IMAGE_SIZE_BYTES = int(os.getenv("MAX_IMAGE_SIZE_MB", "5")) * 1_000_000
```

En el handler `analyze`, reemplazar el bloque de descarga (renumerando los comentarios de los pasos siguientes):

```python
    image_id = req.image_id or req.storage_key

    # 1. Verificar tamaño antes de descargar
    check_object_size(state["s3"], R2_BUCKET, req.storage_key, MAX_IMAGE_SIZE_BYTES)

    # 2. Descargar imagen desde R2
    image_bytes = download_image_bytes(state["s3"], R2_BUCKET, req.storage_key)

    # 3. Decodificar una sola vez a BGR
    bgr_img = bytes_to_bgr(image_bytes)

    # 4. Preprocesar (fallback a imagen original si algo falla)
    debug_meta = None
    try:
        if PREPROCESSING_DEBUG:
            bgr_preprocessed, debug_meta = preprocess(bgr_img, return_debug=True)
        else:
            bgr_preprocessed = preprocess(bgr_img)
    except Exception as e:
        print(f"[preprocess] warning: preprocesado falló, usando imagen original. {e}")
        bgr_preprocessed = bgr_img

    # 5. Inferencia YOLO
    detections = run_inference(state["model"], bgr_preprocessed, CONF_THRESHOLD)

    # 6. Construir reporte fenológico
    report = build_report(detections, bgr_preprocessed, image_id, req.variedad)
```

- [ ] **Step 2: Documentar la variable en `.env.example`**

En `fruit-inference/.env.example`, añadir al final:

```
# Límites de imagen
MAX_IMAGE_SIZE_MB=5
```

- [ ] **Step 3: Verificar que la app arranca correctamente con la wiring nueva**

```bash
cd fruit-inference && INFERENCE_AUTH_TOKEN=test-token python -c "from main import app; print('OK', [r.path for r in app.routes])"
```

Expected: imprime `OK` y la lista de rutas sin errores. (Requiere `INFERENCE_AUTH_TOKEN` porque `main.py` importa `infrastructure.auth` de la Task B1/B2 — si ese grupo aún no está mergeado, correr sin esa env var y sin el import de `verify_inference_token`.)

- [ ] **Step 4: Correr toda la suite de pytest de `fruit-inference`**

```bash
cd fruit-inference && python -m pytest -v
```

Expected: PASS — incluye `test_image_preprocessor.py`, `test_auth.py` (si Grupo B ya está mergeado) y `test_r2_client.py`.

- [ ] **Step 5: Commit**

```bash
git add fruit-inference/main.py fruit-inference/.env.example
git commit -m "feat(inference): rechazar imágenes que excedan MAX_IMAGE_SIZE_MB antes de descargarlas de R2"
```

---

## Self-Review

**Cobertura del spec:**
- SEG-05 (cifrado fcmToken) → Tasks A1, A2. ✅
- SEG-06 (auth fruit-inference) → Tasks B1, B2, B3. ✅
- SEG-07 (validación tamaño R2) → Tasks C1, C2. ✅
- Formato de token `v1:...`, sin migración, límite 5MB, fail-fast, sin dependencias nuevas → reflejado en Global Constraints y en cada task. ✅
- Fuera de alcance (manejo de excepciones de `download_image_bytes`) → declarado explícitamente, no tocado. ✅

**Placeholders:** ninguno — todos los pasos incluyen código completo y comandos exactos.

**Consistencia de tipos/nombres:** `ICryptoPort.encrypt/decrypt` (A1) usado igual en A2; `verify_inference_token` (B1) importado igual en B2; `check_object_size(s3_client, bucket, storage_key, max_bytes)` (C1) invocado con los mismos 4 argumentos en C2; header `x-inference-token` consistente entre B1 (fruit-inference) y B3 (fruit-ms).
