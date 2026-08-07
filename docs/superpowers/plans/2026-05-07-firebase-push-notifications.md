# Firebase Push Notifications Implementation Plan

**Spec relacionado:** [[2026-05-07-firebase-push-notifications-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar Firebase Admin SDK en `fruit-backend` para enviar push notifications reales al Monitor asignado cuando se crea o actualiza el estado de una `SolicitudMuestreo`.

**Architecture:** Se crea un `FcmModule` global con un `FcmService` thin (solo envía, no accede a BD). `SolicitudesService` orquesta: resuelve `fcm_token` del usuario asignado y el nombre del campo, llama a `FcmService.sendToDevice()`, y maneja el error `FcmTokenInvalidError` limpiando el token inválido vía `IUserRepository`. Se extiende `IUserRepository` con dos métodos nuevos para no romper la arquitectura de puertos.

**Tech Stack:** `firebase-admin` (npm), NestJS 11, Mongoose, Jest (tests unitarios con `jest.mock`)

---

## File Map

| Acción | Archivo |
|--------|---------|
| Crear | `fruit-backend/src/fcm/fcm.service.ts` |
| Crear | `fruit-backend/src/fcm/fcm.module.ts` |
| Crear | `fruit-backend/src/fcm/fcm.service.spec.ts` |
| Modificar | `fruit-backend/src/config/envs.ts` |
| Modificar | `fruit-backend/src/app.module.ts` |
| Modificar | `fruit-backend/src/auth/ports/user-repository.port.ts` |
| Modificar | `fruit-backend/src/auth/infrastructure/adapters/mongoose-user.repository.ts` |
| Modificar | `fruit-backend/src/solicitudes/solicitudes.module.ts` |
| Modificar | `fruit-backend/src/solicitudes/solicitudes.service.ts` |
| Modificar | `fruit-backend/src/solicitudes/solicitudes.service.spec.ts` (crear si no existe) |

---

## Task 1: Instalar firebase-admin y agregar env var

**Files:**
- Modify: `fruit-backend/package.json` (via pnpm)
- Modify: `fruit-backend/src/config/envs.ts`
- Modify: `fruit-backend/.env`

- [ ] **Step 1: Instalar el SDK**

Desde `fruit-backend/`:
```bash
pnpm add firebase-admin
```
Expected output: `+ firebase-admin X.Y.Z` agregado a `node_modules`.

- [ ] **Step 2: Agregar la env var a la validación Joi en envs.ts**

Abrir `fruit-backend/src/config/envs.ts`. Agregar `FIREBASE_SERVICE_ACCOUNT_B64` al schema Joi (dentro del objeto que se pasa a `Joi.object({})`):

```typescript
FIREBASE_SERVICE_ACCOUNT_B64: Joi.string().required(),
```

Y en el objeto exportado `envs`, agregar la propiedad:
```typescript
firebaseServiceAccountB64: process.env.FIREBASE_SERVICE_ACCOUNT_B64!,
```

- [ ] **Step 3: Agregar placeholder en .env**

En `fruit-backend/.env`, agregar al final:
```
# Firebase Admin SDK — base64(JSON del service account)
FIREBASE_SERVICE_ACCOUNT_B64=PLACEHOLDER_REPLACE_WITH_BASE64_JSON
```

> Para generar el valor real: en Firebase Console → Project Settings → Service Accounts → Generate new private key → descargar JSON → `base64 -w 0 service-account.json` (Linux/Mac) o `[Convert]::ToBase64String([IO.File]::ReadAllBytes('service-account.json'))` (PowerShell).

- [ ] **Step 4: Verificar que la app arranca con la variable presente**

```bash
pnpm run build
```
Expected: compilación sin errores de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/config/envs.ts fruit-backend/package.json fruit-backend/pnpm-lock.yaml
git commit -m "feat(fcm): install firebase-admin and add FIREBASE_SERVICE_ACCOUNT_B64 env var"
```

---

## Task 2: FcmService (TDD)

**Files:**
- Create: `fruit-backend/src/fcm/fcm.service.ts`
- Create: `fruit-backend/src/fcm/fcm.service.spec.ts`

- [ ] **Step 1: Escribir el test primero**

Crear `fruit-backend/src/fcm/fcm.service.spec.ts`:

```typescript
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn().mockReturnValue({}) },
  messaging: jest.fn(),
}));

import * as admin from 'firebase-admin';
import { FcmService, FcmTokenInvalidError, FcmNotification } from './fcm.service';

const VALID_B64 = Buffer.from(JSON.stringify({ type: 'service_account' })).toString('base64');

function buildService(): FcmService {
  return new FcmService();
}

describe('FcmService', () => {
  let service: FcmService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    process.env.FIREBASE_SERVICE_ACCOUNT_B64 = VALID_B64;
    mockSend = jest.fn();
    (admin.messaging as jest.Mock).mockReturnValue({ send: mockSend });
    service = buildService();
    service.onModuleInit();
  });

  afterEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('throws if FIREBASE_SERVICE_ACCOUNT_B64 is absent', () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
      const svc = buildService();
      expect(() => svc.onModuleInit()).toThrow('FIREBASE_SERVICE_ACCOUNT_B64');
    });

    it('initializes Firebase app with parsed credentials', () => {
      expect(admin.initializeApp).toHaveBeenCalledWith({
        credential: expect.anything(),
      });
    });
  });

  describe('sendToDevice', () => {
    const notification: FcmNotification = { title: 'Test', body: 'Cuerpo' };

    it('calls messaging().send with correct token and notification', async () => {
      mockSend.mockResolvedValue('msg-id');
      await service.sendToDevice('token-abc', notification);
      expect(mockSend).toHaveBeenCalledWith({
        token: 'token-abc',
        notification: { title: 'Test', body: 'Cuerpo' },
      });
    });

    it('throws FcmTokenInvalidError when Firebase returns registration-token-not-registered', async () => {
      mockSend.mockRejectedValue({
        errorInfo: { code: 'messaging/registration-token-not-registered' },
      });
      await expect(service.sendToDevice('bad-token', notification)).rejects.toThrow(
        FcmTokenInvalidError,
      );
    });

    it('does NOT throw for other Firebase errors (swallows them)', async () => {
      mockSend.mockRejectedValue(new Error('quota exceeded'));
      await expect(service.sendToDevice('token-abc', notification)).resolves.toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Correr el test — debe fallar con "Cannot find module"**

```bash
cd fruit-backend && pnpm run test --testPathPattern=fcm.service.spec
```
Expected: FAIL — `Cannot find module './fcm.service'`

- [ ] **Step 3: Crear la implementación mínima**

Crear `fruit-backend/src/fcm/fcm.service.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface FcmNotification {
  title: string;
  body: string;
}

export class FcmTokenInvalidError extends Error {
  constructor(public readonly token: string) {
    super(`FCM token invalid: ${token}`);
    this.name = 'FcmTokenInvalidError';
  }
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  onModuleInit(): void {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 env var is required');
    }
    const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }

  async sendToDevice(fcmToken: string, notification: FcmNotification): Promise<void> {
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title: notification.title, body: notification.body },
      });
    } catch (error: any) {
      const code: string = error?.errorInfo?.code ?? error?.code ?? '';
      if (code === 'messaging/registration-token-not-registered') {
        throw new FcmTokenInvalidError(fcmToken);
      }
      this.logger.error(`[FCM] Error enviando push: ${error?.message ?? error}`);
    }
  }
}
```

- [ ] **Step 4: Correr el test — debe pasar**

```bash
pnpm run test --testPathPattern=fcm.service.spec
```
Expected: `PASS src/fcm/fcm.service.spec.ts` — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/fcm/fcm.service.ts fruit-backend/src/fcm/fcm.service.spec.ts
git commit -m "feat(fcm): add FcmService with sendToDevice and FcmTokenInvalidError"
```

---

## Task 3: FcmModule y registro en AppModule

**Files:**
- Create: `fruit-backend/src/fcm/fcm.module.ts`
- Modify: `fruit-backend/src/app.module.ts`

- [ ] **Step 1: Crear FcmModule**

Crear `fruit-backend/src/fcm/fcm.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { FcmService } from './fcm.service';

@Global()
@Module({
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}
```

- [ ] **Step 2: Registrar en AppModule**

Abrir `fruit-backend/src/app.module.ts`. Agregar `FcmModule` al array `imports` (antes de los módulos de negocio):

```typescript
import { FcmModule } from './fcm/fcm.module';

// dentro de @Module({ imports: [...] })
FcmModule,
```

- [ ] **Step 3: Verificar compilación TypeScript**

```bash
pnpm run build
```
Expected: compilación exitosa sin errores.

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/fcm/fcm.module.ts fruit-backend/src/app.module.ts
git commit -m "feat(fcm): add FcmModule as global module and register in AppModule"
```

---

## Task 4: Extender IUserRepository con findFcmTokenById y clearFcmToken

**Files:**
- Modify: `fruit-backend/src/auth/ports/user-repository.port.ts`
- Modify: `fruit-backend/src/auth/infrastructure/adapters/mongoose-user.repository.ts`

- [ ] **Step 1: Agregar los métodos al port**

Abrir `fruit-backend/src/auth/ports/user-repository.port.ts`. Agregar al final del interface `IUserRepository`:

```typescript
findFcmTokenById(userId: string): Promise<string | null>;
clearFcmToken(userId: string): Promise<void>;
```

- [ ] **Step 2: Verificar que TypeScript reporta error en el adapter**

```bash
pnpm run build
```
Expected: error en `mongoose-user.repository.ts` — `Property 'findFcmTokenById' is missing in type 'MongooseUserRepository'`. Esto confirma que el port está bien extendido.

- [ ] **Step 3: Implementar en MongooseUserRepository**

Abrir `fruit-backend/src/auth/infrastructure/adapters/mongoose-user.repository.ts`. Agregar los dos métodos dentro de la clase:

```typescript
async findFcmTokenById(userId: string): Promise<string | null> {
  if (!Types.ObjectId.isValid(userId)) return null;
  const doc = await this.userModel
    .findById(userId)
    .select('fcm_token')
    .lean<{ fcm_token: string | null }>()
    .exec();
  return doc?.fcm_token ?? null;
}

async clearFcmToken(userId: string): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) return;
  await this.userModel
    .updateOne({ _id: userId }, { fcm_token: null })
    .exec();
}
```

- [ ] **Step 4: Verificar compilación limpia**

```bash
pnpm run build
```
Expected: compilación exitosa sin errores.

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/auth/ports/user-repository.port.ts \
        fruit-backend/src/auth/infrastructure/adapters/mongoose-user.repository.ts
git commit -m "feat(auth): extend IUserRepository with findFcmTokenById and clearFcmToken"
```

---

## Task 5: Integrar FCM en SolicitudesService — creación

**Files:**
- Modify: `fruit-backend/src/solicitudes/solicitudes.service.ts`
- Modify: `fruit-backend/src/solicitudes/solicitudes.module.ts`
- Create/Modify: `fruit-backend/src/solicitudes/solicitudes.service.spec.ts`

### 5a: Actualizar SolicitudesModule

- [ ] **Step 1: Importar CamposModule en SolicitudesModule**

Abrir `fruit-backend/src/solicitudes/solicitudes.module.ts`. El array `imports` debe quedar:

```typescript
import { CamposModule } from '../campos/campos.module';
// ... otros imports existentes

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SolicitudMuestreoDocument.name, schema: SolicitudMuestreoSchema },
    ]),
    AuthModule,
    NotificationsModule,
    CamposModule,   // ← nuevo
  ],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
```

> `FcmModule` es @Global() — no hace falta importarlo aquí. `CamposModule` exporta `CamposService` (verificado en campos.module.ts).

### 5b: Actualizar SolicitudesService (escritura)

- [ ] **Step 2: Escribir el test antes de tocar el service**

Crear (o abrir) `fruit-backend/src/solicitudes/solicitudes.service.spec.ts`. Agregar el siguiente bloque de tests. Si el archivo ya tiene tests, agregarlos dentro del describe principal:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudMuestreoDocument } from './schemas/solicitud-muestreo.schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { FcmService, FcmTokenInvalidError } from '../fcm/fcm.service';
import { I_USER_REPOSITORY } from '../auth/ports/user-repository.port';
import { CamposService } from '../campos/campos.service';

const mockSolicitudModel = {
  create: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
};

const mockGateway = { broadcast: jest.fn() };

const mockFcmService = {
  sendToDevice: jest.fn(),
};

const mockUserRepo = {
  findFcmTokenById: jest.fn(),
  clearFcmToken: jest.fn(),
};

const mockCamposService = {
  findById: jest.fn(),
};

async function buildModule(): Promise<SolicitudesService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SolicitudesService,
      { provide: getModelToken(SolicitudMuestreoDocument.name), useValue: mockSolicitudModel },
      { provide: NotificationsGateway, useValue: mockGateway },
      { provide: FcmService, useValue: mockFcmService },
      { provide: I_USER_REPOSITORY, useValue: mockUserRepo },
      { provide: CamposService, useValue: mockCamposService },
    ],
  }).compile();
  return module.get(SolicitudesService);
}

describe('SolicitudesService — FCM integration', () => {
  let service: SolicitudesService;

  beforeEach(async () => {
    service = await buildModule();
    jest.clearAllMocks();
  });

  describe('create()', () => {
    const dto = {
      campo_id: '6630000000000000000000a1',
      asignado_a: '6630000000000000000000b1',
      mensaje: 'Muestreo urgente',
      fecha_limite: '2026-05-10',
    };
    const fakeSolicitud = { _id: 'sol1', ...dto, estado: 'PENDIENTE' };

    beforeEach(() => {
      mockSolicitudModel.create.mockResolvedValue(fakeSolicitud);
      mockCamposService.findById.mockResolvedValue({ nombre: 'Finca El Rosal' });
    });

    it('sends push with campo nombre and fecha_limite when user has fcm_token', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue('token-monitor');

      await service.create('admin-id', dto);

      expect(mockFcmService.sendToDevice).toHaveBeenCalledWith('token-monitor', {
        title: 'Nueva solicitud: Finca El Rosal',
        body: 'Fecha límite: 10/5/2026. Abre la app para ver detalles.',
      });
    });

    it('logs warning and does NOT send push when user has no fcm_token', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue(null);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await service.create('admin-id', dto);

      expect(mockFcmService.sendToDevice).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('sin token registrado'),
      );
    });

    it('clears fcm_token when FcmTokenInvalidError is thrown', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue('expired-token');
      mockFcmService.sendToDevice.mockRejectedValue(
        new FcmTokenInvalidError('expired-token'),
      );

      await service.create('admin-id', dto);

      expect(mockUserRepo.clearFcmToken).toHaveBeenCalledWith(dto.asignado_a);
    });

    it('uses campo_id as fallback title when campo not found', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue('token-monitor');
      mockCamposService.findById.mockRejectedValue(new Error('Not found'));

      await service.create('admin-id', dto);

      expect(mockFcmService.sendToDevice).toHaveBeenCalledWith(
        'token-monitor',
        expect.objectContaining({ title: expect.stringContaining(dto.campo_id) }),
      );
    });
  });
});
```

- [ ] **Step 3: Correr tests — deben fallar**

```bash
pnpm run test --testPathPattern=solicitudes.service.spec
```
Expected: FAIL — los tests de FCM fallan porque `SolicitudesService` aún no inyecta `FcmService`.

- [ ] **Step 4: Actualizar SolicitudesService — inyecciones y método privado**

Abrir `fruit-backend/src/solicitudes/solicitudes.service.ts`.

**4a. Agregar imports al inicio del archivo:**
```typescript
import { Inject } from '@nestjs/common';
import { FcmService, FcmTokenInvalidError, FcmNotification } from '../fcm/fcm.service';
import { IUserRepository, I_USER_REPOSITORY } from '../auth/ports/user-repository.port';
import { CamposService } from '../campos/campos.service';
```

**4b. Agregar parámetros al constructor** (manteniendo los existentes):
```typescript
constructor(
  // ... parámetros existentes (modelo Mongoose, NotificationsGateway, etc.) ...
  private readonly fcmService: FcmService,
  @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
  private readonly camposService: CamposService,
) {}
```

**4c. Agregar el método privado `sendSolicitudPush` al final de la clase:**
```typescript
private async sendSolicitudPush(
  userId: string | undefined | null,
  campoId: string | undefined | null,
  fechaLimite: string | Date | null | undefined,
  event: 'created' | 'cancelled' | 'completed',
): Promise<void> {
  if (!userId) return;

  const fcmToken = await this.userRepository.findFcmTokenById(userId);
  if (!fcmToken) {
    this.logger.warn(`[FCM] Monitor ${userId} sin token registrado`);
    return;
  }

  let campoNombre: string = campoId ?? 'desconocido';
  if (campoId) {
    try {
      const campo = await this.camposService.findById(campoId);
      campoNombre = campo.nombre;
    } catch {
      // campo no encontrado, se usa campoId como fallback
    }
  }

  const notifications: Record<typeof event, FcmNotification> = {
    created: {
      title: `Nueva solicitud: ${campoNombre}`,
      body: `Fecha límite: ${
        fechaLimite
          ? new Date(fechaLimite).toLocaleDateString('es-ES')
          : 'sin fecha'
      }. Abre la app para ver detalles.`,
    },
    cancelled: {
      title: `Solicitud cancelada: ${campoNombre}`,
      body: 'La solicitud de muestreo fue cancelada.',
    },
    completed: {
      title: `Solicitud completada: ${campoNombre}`,
      body: 'El análisis ha sido marcado como completado.',
    },
  };

  try {
    await this.fcmService.sendToDevice(fcmToken, notifications[event]);
  } catch (e) {
    if (e instanceof FcmTokenInvalidError) {
      await this.userRepository.clearFcmToken(userId);
      this.logger.log(`[FCM] Token inválido limpiado para usuario ${userId}`);
    }
  }
}
```

**4d. Llamar `sendSolicitudPush` al final del método `create()`**, justo después del `notificationsGateway.broadcast(...)` existente:

```typescript
// Al final de create(), después del broadcast WebSocket existente:
await this.sendSolicitudPush(
  dto.asignado_a,
  dto.campo_id,
  dto.fecha_limite ?? null,
  'created',
);
```

- [ ] **Step 5: Correr tests — deben pasar**

```bash
pnpm run test --testPathPattern=solicitudes.service.spec
```
Expected: `PASS` — todos los tests de `create()` passing.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/solicitudes/solicitudes.service.ts \
        fruit-backend/src/solicitudes/solicitudes.service.spec.ts \
        fruit-backend/src/solicitudes/solicitudes.module.ts
git commit -m "feat(solicitudes): send FCM push on SolicitudMuestreo creation"
```

---

## Task 6: Integrar FCM en SolicitudesService — cambios de estado

**Files:**
- Modify: `fruit-backend/src/solicitudes/solicitudes.service.ts`
- Modify: `fruit-backend/src/solicitudes/solicitudes.service.spec.ts`

- [ ] **Step 1: Agregar tests para updateEstado()**

En `fruit-backend/src/solicitudes/solicitudes.service.spec.ts`, agregar dentro del describe principal:

```typescript
describe('updateEstado()', () => {
  const solicitudId = '6630000000000000000000c1';
  const fakeSolicitud = {
    _id: solicitudId,
    asignado_a: { toString: () => '6630000000000000000000b1' },
    campo_id: { toString: () => '6630000000000000000000a1' },
    estado: 'CANCELADO',
  };

  beforeEach(() => {
    mockSolicitudModel.findByIdAndUpdate = jest.fn().mockResolvedValue(fakeSolicitud);
    mockCamposService.findById.mockResolvedValue({ nombre: 'Finca El Rosal' });
    mockUserRepo.findFcmTokenById.mockResolvedValue('token-monitor');
  });

  it('sends push on CANCELADO', async () => {
    await service.updateEstado(solicitudId, 'CANCELADO');

    expect(mockFcmService.sendToDevice).toHaveBeenCalledWith('token-monitor', {
      title: 'Solicitud cancelada: Finca El Rosal',
      body: 'La solicitud de muestreo fue cancelada.',
    });
  });

  it('sends push on COMPLETADO', async () => {
    fakeSolicitud.estado = 'COMPLETADO';
    mockSolicitudModel.findByIdAndUpdate.mockResolvedValue({ ...fakeSolicitud, estado: 'COMPLETADO' });

    await service.updateEstado(solicitudId, 'COMPLETADO');

    expect(mockFcmService.sendToDevice).toHaveBeenCalledWith('token-monitor', {
      title: 'Solicitud completada: Finca El Rosal',
      body: 'El análisis ha sido marcado como completado.',
    });
  });

  it('does NOT send push on EN_PROGRESO', async () => {
    await service.updateEstado(solicitudId, 'EN_PROGRESO');

    expect(mockFcmService.sendToDevice).not.toHaveBeenCalled();
  });

  it('does NOT send push on PENDIENTE', async () => {
    await service.updateEstado(solicitudId, 'PENDIENTE');

    expect(mockFcmService.sendToDevice).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr tests — los de updateEstado deben fallar**

```bash
pnpm run test --testPathPattern=solicitudes.service.spec
```
Expected: los tests de `create()` siguen pasando, los de `updateEstado()` fallan.

- [ ] **Step 3: Actualizar el método updateEstado() en SolicitudesService**

Abrir `fruit-backend/src/solicitudes/solicitudes.service.ts`. Localizar el método `updateEstado`. Asegurarse de que usa `findByIdAndUpdate` con `{ new: true }` para obtener el documento actualizado, y agregar la llamada a FCM al final:

```typescript
async updateEstado(id: string, estado: EstadoSolicitud): Promise<SolicitudMuestreoDocument> {
  // Reemplazar la línea de findByIdAndUpdate por esta si aún no usa { new: true }:
  const solicitud = await this.solicitudModel
    .findByIdAndUpdate(id, { estado }, { new: true })
    .exec();

  if (!solicitud) {
    throw new NotFoundException(`Solicitud ${id} no encontrada`);
  }

  // Push solo para estados que requieren notificación al Monitor
  if (estado === 'CANCELADO' || estado === 'COMPLETADO') {
    await this.sendSolicitudPush(
      solicitud.asignado_a?.toString(),
      solicitud.campo_id?.toString(),
      null,
      estado === 'CANCELADO' ? 'cancelled' : 'completed',
    );
  }

  return solicitud;
}
```

> Si el método `updateEstado` ya tenía otra implementación (e.g. `findOneAndUpdate`, logging, etc.), conservar la lógica existente y solo agregar el bloque `if (estado === 'CANCELADO' || ...)` al final.

- [ ] **Step 4: Correr todos los tests — deben pasar**

```bash
pnpm run test --testPathPattern=solicitudes.service.spec
```
Expected: `PASS` — todos los tests passing.

- [ ] **Step 5: Correr la suite completa para detectar regresiones**

```bash
pnpm run test
```
Expected: todos los tests del proyecto passing.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/solicitudes/solicitudes.service.ts \
        fruit-backend/src/solicitudes/solicitudes.service.spec.ts
git commit -m "feat(solicitudes): send FCM push on CANCELADO and COMPLETADO state changes"
```

---

## Self-Review checklist

- [x] **Spec coverage:** FcmModule global ✓ | sendToDevice API ✓ | creación push ✓ | CANCELADO/COMPLETADO push ✓ | no push EN_PROGRESO ✓ | warning sin token ✓ | clearFcmToken on invalid ✓ | swallow other errors ✓ | fail-fast en init ✓ | campo nombre lookup ✓ | campo fallback ✓
- [x] **Placeholders:** ninguno
- [x] **Consistencia de tipos:** `FcmNotification`, `FcmTokenInvalidError`, `findFcmTokenById`, `clearFcmToken` — usados consistentemente en todos los tasks
- [x] **Dependencias entre tasks:** Task 5 depende de Task 2 (FcmService) y Task 4 (IUserRepository). Task 6 depende de Task 5 (método privado `sendSolicitudPush`). Task 3 depende de Task 2. Orden correcto.
