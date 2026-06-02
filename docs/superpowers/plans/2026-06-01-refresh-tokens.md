# Refresh Tokens con Rotación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el JWT de 7 días por access tokens de 15 min + refresh tokens rotativos con detección de robo por familia, resolviendo SEG-03.

**Architecture:** El refresh token es una cadena aleatoria de 256 bits (base64url), no un JWT. Se almacena hasheado (SHA-256) en PostgreSQL. Cada uso rota el token; si se detecta un token ya rotado, se invalida toda la familia de sesión. Flutter realiza silent refresh en el interceptor Dio antes de hacer logout.

**Tech Stack:** NestJS 11, Prisma, PostgreSQL, `crypto` (Node built-in), `ms`, Flutter Dio interceptor, `flutter_secure_storage`.

---

## File Map

| Acción | Archivo |
|--------|---------|
| Modificar | `packages/database/prisma/schema.prisma` |
| Modificar | `fruit-backend/src/auth/ports/user-repository.port.ts` |
| Modificar | `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts` |
| Modificar | `fruit-backend/src/auth/infrastructure/adapters/in-memory-user.repository.ts` |
| Crear | `fruit-backend/src/auth/ports/refresh-token-repository.port.ts` |
| Crear | `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.ts` |
| Crear | `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.spec.ts` |
| Modificar | `fruit-backend/src/config/envs.ts` |
| Modificar | `fruit-backend/src/auth/infrastructure/auth.module.ts` |
| Modificar | `fruit-backend/src/auth/application/auth.service.ts` |
| Crear | `fruit-backend/src/auth/application/auth.service.spec.ts` |
| Modificar | `fruit-backend/src/auth/infrastructure/http/auth.controller.ts` |
| Modificar | `zarza_ai/lib/domain/entities/auth_result_entity.dart` |
| Modificar | `zarza_ai/lib/data/models/auth_response_model.dart` |
| Modificar | `zarza_ai/lib/data/datasources/local_auth_datasource.dart` |
| Modificar | `zarza_ai/lib/data/repositories/auth_repository_impl.dart` |
| Modificar | `zarza_ai/lib/core/network/auth_interceptor.dart` |
| Modificar | `zarza_ai/lib/core/constants/app_constants.dart` |

---

### Task 1: Prisma schema — agregar modelo RefreshToken

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Agregar la relación inversa en `User` y el modelo `RefreshToken` al final del schema**

En `packages/database/prisma/schema.prisma`, en el modelo `User` (línea 42), agregar la relación al final de la lista de relaciones (antes de `@@map("users")`):

```prisma
  refreshTokens RefreshToken[]
```

El bloque `User` queda:

```prisma
model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role
  fcmToken     String?  @map("fcm_token")
  firstName    String?  @map("first_name")
  lastName     String?  @map("last_name")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  camposAsignados      UserCampo[]
  camposProductor      Campo[]             @relation("CampoProductor")
  solicitudesCreadas   SolicitudMuestreo[] @relation("SolicitudCreadoPor")
  solicitudesAsignadas SolicitudMuestreo[] @relation("SolicitudAsignadoA")
  analysesAsRequester  Analysis[]          @relation("AnalysisRequester")
  analysesAsProductor  Analysis[]          @relation("AnalysisProductor")
  analysesValidadas    Analysis[]          @relation("AnalysisValidador")
  refreshTokens        RefreshToken[]

  @@map("users")
}
```

Al final del archivo, agregar:

```prisma
model RefreshToken {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tokenHash String    @unique @map("token_hash")
  userId    String    @map("user_id") @db.Uuid
  familyId  String    @map("family_id") @db.Uuid
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@map("refresh_tokens")
}
```

- [ ] **Step 2: Crear migración y regenerar el cliente Prisma**

```bash
cd packages/database && npx prisma migrate dev --name add_refresh_tokens
```

Resultado esperado: nueva carpeta en `packages/database/prisma/migrations/` y mensaje `Your database is now in sync with your schema.`

- [ ] **Step 3: Verificar que el cliente generado tiene `refreshToken`**

```bash
grep -r "refreshToken" packages/database/generated/client/index.d.ts | head -5
```

Resultado esperado: al menos una línea con `refreshToken`.

- [ ] **Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat(db): add RefreshToken table with family-based rotation support"
```

---

### Task 2: IUserRepository — agregar `findUserById`

El método existente `findById` devuelve `UserCampos` (sin email ni role). `AuthService.refresh()` necesita el `User` completo para firmar el nuevo JWT.

**Files:**
- Modify: `fruit-backend/src/auth/ports/user-repository.port.ts`
- Modify: `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`
- Modify: `fruit-backend/src/auth/infrastructure/adapters/in-memory-user.repository.ts`

- [ ] **Step 1: Agregar `findUserById` a la interfaz**

En `fruit-backend/src/auth/ports/user-repository.port.ts`, agregar el método a `IUserRepository` (después de `findById`):

```typescript
findUserById(id: string): Promise<User | null>;
```

El archivo completo queda:

```typescript
import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';

export const I_USER_REPOSITORY = Symbol('I_USER_REPOSITORY');

export type CreateUserData = {
  email: string;
  passwordHash: string;
  role: Role;
  firstName?: string;
  lastName?: string;
};

export type UserCampos = {
  id: string;
  camposAsignados: string[];
};

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<UserCampos | null>;
  findUserById(id: string): Promise<User | null>;
  findFcmTokenById(userId: string): Promise<string | null>;
  clearFcmToken(userId: string): Promise<void>;
  saveFcmToken(userId: string, token: string): Promise<void>;
  updateProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<void>;
}
```

- [ ] **Step 2: Implementar en `PrismaUserRepository`**

En `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`, agregar después del método `findById` existente:

```typescript
  async findUserById(id: string): Promise<User | null> {
    const doc = await this.prisma.user.findUnique({ where: { id } });
    if (!doc) return null;
    return new User(
      doc.id,
      doc.email,
      doc.passwordHash,
      doc.role as Role,
      doc.firstName ?? null,
      doc.lastName ?? null,
    );
  }
```

- [ ] **Step 3: Implementar en `InMemoryUserRepository`**

En `fruit-backend/src/auth/infrastructure/adapters/in-memory-user.repository.ts`, agregar después del método `findById`:

```typescript
  async findUserById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }
```

- [ ] **Step 4: Verificar compilación**

```bash
cd fruit-backend && pnpm run build 2>&1 | tail -10
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 5: Commit**

```bash
cd fruit-backend && git add src/auth/ports/user-repository.port.ts src/auth/infrastructure/adapters/prisma-user.repository.ts src/auth/infrastructure/adapters/in-memory-user.repository.ts
git commit -m "feat(auth): add findUserById to IUserRepository for refresh token flow"
```

---

### Task 3: IRefreshTokenRepository — puerto y adaptador Prisma (TDD)

**Files:**
- Create: `fruit-backend/src/auth/ports/refresh-token-repository.port.ts`
- Create: `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.ts`
- Create: `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.spec.ts`

- [ ] **Step 1: Crear el puerto**

```typescript
// fruit-backend/src/auth/ports/refresh-token-repository.port.ts
export const I_REFRESH_TOKEN_REPOSITORY = Symbol('I_REFRESH_TOKEN_REPOSITORY');

export type RefreshTokenRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface IRefreshTokenRepository {
  create(params: {
    tokenHash: string;
    userId: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<void>;

  findByTokenHash(hash: string): Promise<RefreshTokenRecord | null>;

  revokeByTokenHash(hash: string): Promise<void>;

  revokeByFamilyId(familyId: string): Promise<void>;

  deleteExpired(): Promise<number>;
}
```

- [ ] **Step 2: Escribir los tests del adaptador**

```typescript
// fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.spec.ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '@rubus/database';
import { PrismaRefreshTokenRepository } from './prisma-refresh-token.repository';

const mockPrisma = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('PrismaRefreshTokenRepository', () => {
  let repo: PrismaRefreshTokenRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PrismaRefreshTokenRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    repo = module.get(PrismaRefreshTokenRepository);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('persiste el registro en prisma.refreshToken', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});
      const params = {
        tokenHash: 'abc123',
        userId: 'user-1',
        familyId: 'family-1',
        expiresAt: new Date('2099-01-01'),
      };

      await repo.create(params);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({ data: params });
    });
  });

  describe('findByTokenHash()', () => {
    it('devuelve el registro si existe', async () => {
      const record = {
        id: 'rt-1', tokenHash: 'abc', userId: 'u1',
        familyId: 'f1', expiresAt: new Date(), revokedAt: null, createdAt: new Date(),
      };
      mockPrisma.refreshToken.findUnique.mockResolvedValue(record);

      const result = await repo.findByTokenHash('abc');

      expect(result).toEqual(record);
      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: 'abc' },
      });
    });

    it('devuelve null si no existe', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      expect(await repo.findByTokenHash('nope')).toBeNull();
    });
  });

  describe('revokeByFamilyId()', () => {
    it('marca como revocados todos los tokens activos de la familia', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await repo.revokeByFamilyId('family-1');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteExpired()', () => {
    it('elimina registros con expiresAt en el pasado y devuelve el conteo', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      const count = await repo.deleteExpired();

      expect(count).toBe(5);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });
});
```

- [ ] **Step 3: Correr tests — deben fallar**

```bash
cd fruit-backend && pnpm run test -- --testPathPattern="prisma-refresh-token.repository.spec" --no-coverage
```

Resultado esperado: `FAIL — Cannot find module './prisma-refresh-token.repository'`.

- [ ] **Step 4: Implementar el adaptador**

```typescript
// fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import {
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from '../../ports/refresh-token-repository.port';

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    tokenHash: string;
    userId: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.refreshToken.create({ data: params });
  }

  async findByTokenHash(hash: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  }

  async revokeByTokenHash(hash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByFamilyId(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
```

- [ ] **Step 5: Correr tests — deben pasar**

```bash
cd fruit-backend && pnpm run test -- --testPathPattern="prisma-refresh-token.repository.spec" --no-coverage
```

Resultado esperado: `4 passed`.

- [ ] **Step 6: Commit**

```bash
cd fruit-backend && git add src/auth/ports/refresh-token-repository.port.ts src/auth/infrastructure/adapters/prisma-refresh-token.repository.ts src/auth/infrastructure/adapters/prisma-refresh-token.repository.spec.ts
git commit -m "feat(auth): add IRefreshTokenRepository port and Prisma adapter"
```

---

### Task 4: Env vars — renombrar JWT_EXPIRES_IN

**Files:**
- Modify: `fruit-backend/src/config/envs.ts`

- [ ] **Step 1: Actualizar `envs.ts` con las nuevas variables**

Reemplazar el contenido completo de `fruit-backend/src/config/envs.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  RABBITMQ_URL: string;
  RABBITMQ_QUEUE: string;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  FIREBASE_SERVICE_ACCOUNT_B64: string;
  INTERNAL_NOTIFY_TOKEN: string;
}

const envSchema = joi
  .object({
    PORT: joi.number().required(),
    R2_ENDPOINT: joi.string().uri().required(),
    R2_ACCESS_KEY_ID: joi.string().required(),
    R2_SECRET_ACCESS_KEY: joi.string().required(),
    R2_BUCKET_NAME: joi.string().required(),
    RABBITMQ_URL: joi.string().required(),
    RABBITMQ_QUEUE: joi.string().required(),
    JWT_SECRET: joi.string().required(),
    JWT_ACCESS_EXPIRES_IN: joi.string().required(),
    JWT_REFRESH_EXPIRES_IN: joi.string().required(),
    CORS_ORIGIN: joi.string().optional().default('http://localhost:5173'),
    FIREBASE_SERVICE_ACCOUNT_B64: joi.string().required(),
    INTERNAL_NOTIFY_TOKEN: joi.string().min(32).required(),
  })
  .unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  r2Endpoint: envVars.R2_ENDPOINT,
  r2AccessKeyId: envVars.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: envVars.R2_SECRET_ACCESS_KEY,
  r2BucketName: envVars.R2_BUCKET_NAME,
  rabbitmqUrl: envVars.RABBITMQ_URL,
  rabbitmqQueue: envVars.RABBITMQ_QUEUE,
  jwtSecret: envVars.JWT_SECRET,
  jwtAccessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  corsOrigin: envVars.CORS_ORIGIN,
  firebaseServiceAccountB64: envVars.FIREBASE_SERVICE_ACCOUNT_B64,
  internalNotifyToken: envVars.INTERNAL_NOTIFY_TOKEN,
};
```

- [ ] **Step 2: Actualizar `.env` local (si existe) y `.env.example`**

En el archivo `.env` de `fruit-backend` (no en el repo), renombrar la variable:
```
# Antes:
JWT_EXPIRES_IN=7d

# Después:
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

En `fruit-backend/.env.example`, agregar las nuevas variables:
```
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

- [ ] **Step 3: Verificar compilación**

```bash
cd fruit-backend && pnpm run build 2>&1 | tail -10
```

Resultado esperado: si `JWT_EXPIRES_IN` aún se usa en `auth.module.ts`, habrá un error de `jwtExpiresIn not found` en tiempo de ejecución (no compilación). Se resuelve en Task 5.

- [ ] **Step 4: Commit**

```bash
cd fruit-backend && git add src/config/envs.ts .env.example
git commit -m "feat(auth): rename JWT_EXPIRES_IN to JWT_ACCESS_EXPIRES_IN, add JWT_REFRESH_EXPIRES_IN"
```

---

### Task 5: auth.module.ts — actualizar JwtModule y providers

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/auth.module.ts`

- [ ] **Step 1: Instalar la dependencia `ms`**

```bash
cd fruit-backend && pnpm add ms && pnpm add -D @types/ms
```

- [ ] **Step 2: Reemplazar el contenido de `auth.module.ts`**

```typescript
// fruit-backend/src/auth/infrastructure/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import ms from 'ms';
import { AuthController, AUTH_SERVICE } from './http/auth.controller';
import { AuthService } from '../application/auth.service';
import { I_USER_REPOSITORY } from '../ports/user-repository.port';
import { I_HASHER_PORT } from '../ports/hasher.port';
import { I_TOKEN_PORT } from '../ports/token.port';
import { I_REFRESH_TOKEN_REPOSITORY } from '../ports/refresh-token-repository.port';
import { PrismaUserRepository } from './adapters/prisma-user.repository';
import { BcryptHasher } from './adapters/bcrypt-hasher.adapter';
import { JwtTokenService } from './adapters/jwt-token.adapter';
import { PrismaRefreshTokenRepository } from './adapters/prisma-refresh-token.repository';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: I_USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: I_HASHER_PORT, useClass: BcryptHasher },
    { provide: I_TOKEN_PORT, useClass: JwtTokenService },
    { provide: I_REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    {
      provide: AUTH_SERVICE,
      useFactory: (
        userRepo,
        hasher,
        tokenPort,
        refreshTokenRepo,
        configService: ConfigService,
      ) => {
        const rawExpiry = configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
        return new AuthService(userRepo, hasher, tokenPort, refreshTokenRepo, ms(rawExpiry));
      },
      inject: [
        I_USER_REPOSITORY,
        I_HASHER_PORT,
        I_TOKEN_PORT,
        I_REFRESH_TOKEN_REPOSITORY,
        ConfigService,
      ],
    },
  ],
  exports: [I_TOKEN_PORT, I_HASHER_PORT, I_USER_REPOSITORY],
})
export class AuthModule {}
```

- [ ] **Step 3: Verificar compilación**

```bash
cd fruit-backend && pnpm run build 2>&1 | tail -10
```

Resultado esperado: `Successfully compiled` — puede haber un error de TypeScript sobre `AuthService` porque aún tiene la firma antigua. Se resuelve en Task 6.

- [ ] **Step 4: Commit**

```bash
cd fruit-backend && git add src/auth/infrastructure/auth.module.ts package.json pnpm-lock.yaml
git commit -m "feat(auth): wire PrismaRefreshTokenRepository and ms-based expiry in AuthModule"
```

---

### Task 6: AuthService — tests + implementación

**Files:**
- Modify: `fruit-backend/src/auth/application/auth.service.ts`
- Create: `fruit-backend/src/auth/application/auth.service.spec.ts`

- [ ] **Step 1: Escribir el archivo de tests**

```typescript
// fruit-backend/src/auth/application/auth.service.spec.ts
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InvalidCredentialsError } from '../domain/errors/auth.errors';
import { Role } from '../domain/enums/role.enum';
import { User } from '../domain/entities/user.entity';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const mockUserRepo = {
  findByEmail: jest.fn(),
  save: jest.fn(),
  findById: jest.fn(),
  findUserById: jest.fn(),
  findFcmTokenById: jest.fn(),
  clearFcmToken: jest.fn(),
  saveFcmToken: jest.fn(),
  updateProfile: jest.fn(),
};

const mockHasher = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockTokenService = {
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
};

const mockRefreshRepo = {
  create: jest.fn(),
  findByTokenHash: jest.fn(),
  revokeByTokenHash: jest.fn(),
  revokeByFamilyId: jest.fn(),
  deleteExpired: jest.fn(),
};

function makeUser(overrides: Partial<User> = {}): User {
  return new User(
    overrides.id ?? 'user-1',
    overrides.email ?? 'test@example.com',
    'hashed-pw',
    (overrides.role as Role) ?? Role.PRODUCTOR,
    null,
    null,
  );
}

function makeService(): AuthService {
  return new AuthService(
    mockUserRepo as any,
    mockHasher as any,
    mockTokenService as any,
    mockRefreshRepo as any,
    SEVEN_DAYS_MS,
  );
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
  });

  describe('login()', () => {
    it('devuelve token, refreshToken y user al autenticar correctamente', async () => {
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockHasher.compare.mockResolvedValue(true);
      mockTokenService.generateToken.mockResolvedValue('access-jwt');
      mockRefreshRepo.create.mockResolvedValue(undefined);

      const result = await service.login('test@example.com', 'password');

      expect(result.token).toBe('access-jwt');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
      expect(result.user.email).toBe('test@example.com');
    });

    it('persiste el hash del refresh token en la BD (nunca el token en claro)', async () => {
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockHasher.compare.mockResolvedValue(true);
      mockTokenService.generateToken.mockResolvedValue('access-jwt');
      mockRefreshRepo.create.mockResolvedValue(undefined);

      const result = await service.login('test@example.com', 'password');

      expect(mockRefreshRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          expiresAt: expect.any(Date),
          familyId: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
          ),
        }),
      );
      // El hash almacenado NO debe ser igual al token en claro
      const storedHash = mockRefreshRepo.create.mock.calls[0][0].tokenHash;
      expect(storedHash).not.toBe(result.refreshToken);
      expect(storedHash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    });

    it('lanza InvalidCredentialsError si el usuario no existe', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      await expect(service.login('no@user.com', 'pw')).rejects.toThrow(InvalidCredentialsError);
    });

    it('lanza InvalidCredentialsError si la contraseña es incorrecta', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser());
      mockHasher.compare.mockResolvedValue(false);
      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(
        InvalidCredentialsError,
      );
    });
  });

  describe('refresh()', () => {
    const FAMILY_ID = 'family-uuid-1';

    it('rota el token correctamente: revoca el actual, emite nuevos con el mismo familyId', async () => {
      const user = makeUser();
      const futureDate = new Date(Date.now() + 60_000);

      mockRefreshRepo.findByTokenHash.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'some-hash',
        userId: 'user-1',
        familyId: FAMILY_ID,
        expiresAt: futureDate,
        revokedAt: null,
      });
      mockRefreshRepo.revokeByTokenHash.mockResolvedValue(undefined);
      mockUserRepo.findUserById.mockResolvedValue(user);
      mockTokenService.generateToken.mockResolvedValue('new-access-jwt');
      mockRefreshRepo.create.mockResolvedValue(undefined);

      const result = await service.refresh('raw-refresh-token');

      expect(result.token).toBe('new-access-jwt');
      expect(result.refreshToken).toBeDefined();
      expect(mockRefreshRepo.revokeByTokenHash).toHaveBeenCalledTimes(1);
      // El nuevo token debe tener el mismo familyId
      expect(mockRefreshRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: FAMILY_ID }),
      );
    });

    it('detecta robo: revoca toda la familia si el token ya estaba revocado', async () => {
      mockRefreshRepo.findByTokenHash.mockResolvedValue({
        id: 'rt-old',
        tokenHash: 'old-hash',
        userId: 'user-1',
        familyId: FAMILY_ID,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(), // ya revocado
      });
      mockRefreshRepo.revokeByFamilyId.mockResolvedValue(undefined);

      await expect(service.refresh('stolen-token')).rejects.toThrow(UnauthorizedException);
      expect(mockRefreshRepo.revokeByFamilyId).toHaveBeenCalledWith(FAMILY_ID);
    });

    it('lanza 401 si el token no existe en la BD', async () => {
      mockRefreshRepo.findByTokenHash.mockResolvedValue(null);
      await expect(service.refresh('fake-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lanza 401 si el token está expirado', async () => {
      mockRefreshRepo.findByTokenHash.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash',
        userId: 'user-1',
        familyId: FAMILY_ID,
        expiresAt: new Date(Date.now() - 1000), // expirado
        revokedAt: null,
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout()', () => {
    it('revoca el refresh token en la BD', async () => {
      mockRefreshRepo.revokeByTokenHash.mockResolvedValue(undefined);

      await service.logout('some-refresh-token');

      expect(mockRefreshRepo.revokeByTokenHash).toHaveBeenCalledTimes(1);
    });

    it('no lanza error si rawToken es undefined', async () => {
      await expect(service.logout(undefined)).resolves.not.toThrow();
      expect(mockRefreshRepo.revokeByTokenHash).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
cd fruit-backend && pnpm run test -- --testPathPattern="auth.service.spec" --no-coverage
```

Resultado esperado: `FAIL — AuthService is not a constructor` o errores de firma del constructor.

- [ ] **Step 3: Reemplazar `auth.service.ts`**

```typescript
// fruit-backend/src/auth/application/auth.service.ts
import { UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';
import { IUserRepository } from '../ports/user-repository.port';
import { IHasherPort } from '../ports/hasher.port';
import { ITokenPort } from '../ports/token.port';
import { IRefreshTokenRepository } from '../ports/refresh-token-repository.port';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
} from '../domain/errors/auth.errors';

export type UserProfile = {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
};

export type RegisteredUserResult = {
  user: UserProfile;
  token: string;
};

export type LoginResult = {
  token: string;
  refreshToken: string;
  user: UserProfile;
};

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hasher: IHasherPort,
    private readonly tokenService: ITokenPort,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly refreshExpiresMs: number,
  ) {}

  async register(
    email: string,
    plainPassword: string,
    firstName?: string,
    lastName?: string,
  ): Promise<RegisteredUserResult> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserAlreadyExistsError(email);
    }

    const passwordHash = await this.hasher.hash(plainPassword);

    const newUser = await this.userRepository.save({
      email,
      passwordHash,
      role: Role.MONITOR,
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
    });

    const token = await this.tokenService.generateToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return { user: this._toProfile(newUser), token };
  }

  async login(email: string, plainPassword: string): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new InvalidCredentialsError();

    const isPasswordValid = await this.hasher.compare(plainPassword, user.hashedPassword);
    if (!isPasswordValid) throw new InvalidCredentialsError();

    const accessToken = await this.tokenService.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = this._generateRefreshToken();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

    await this.refreshTokenRepo.create({
      tokenHash: this._hashToken(refreshToken),
      userId: user.id,
      familyId,
      expiresAt,
    });

    return { token: accessToken, refreshToken, user: this._toProfile(user) };
  }

  async refresh(rawToken: string): Promise<{ token: string; refreshToken: string }> {
    const hash = this._hashToken(rawToken);
    const record = await this.refreshTokenRepo.findByTokenHash(hash);

    if (!record) throw new UnauthorizedException('Refresh token inválido');

    if (record.revokedAt !== null) {
      await this.refreshTokenRepo.revokeByFamilyId(record.familyId);
      throw new UnauthorizedException('Refresh token reutilizado — sesión invalidada');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    await this.refreshTokenRepo.revokeByTokenHash(hash);

    const user = await this.userRepository.findUserById(record.userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const newAccessToken = await this.tokenService.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = this._generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

    await this.refreshTokenRepo.create({
      tokenHash: this._hashToken(newRefreshToken),
      userId: user.id,
      familyId: record.familyId,
      expiresAt,
    });

    return { token: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const hash = this._hashToken(rawToken);
    await this.refreshTokenRepo.revokeByTokenHash(hash);
  }

  private _generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private _hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private _toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
```

- [ ] **Step 4: Correr tests — deben pasar todos**

```bash
cd fruit-backend && pnpm run test -- --testPathPattern="auth.service.spec" --no-coverage
```

Resultado esperado: `9 passed`.

- [ ] **Step 5: Commit**

```bash
cd fruit-backend && git add src/auth/application/auth.service.ts src/auth/application/auth.service.spec.ts
git commit -m "feat(auth): add refresh/logout to AuthService with rotation and theft detection"
```

---

### Task 7: AuthController — nuevos endpoints y DTOs

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/http/auth.controller.ts`

- [ ] **Step 1: Reemplazar el contenido completo del controlador**

```typescript
// fruit-backend/src/auth/infrastructure/http/auth.controller.ts
import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Inject,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, IsNotEmpty, IsOptional } from 'class-validator';
import type { FastifyReply } from 'fastify';
import { AuthService } from '../../application/auth.service';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
} from '../../domain/errors/auth.errors';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../domain/enums/role.enum';
import { I_USER_REPOSITORY, type IUserRepository } from '../../ports/user-repository.port';

export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

const COOKIE_NAME = 'access_token';
const ACCESS_COOKIE_MAX_AGE = 900; // 15 minutos

class FcmTokenDto {
  @IsString()
  @MaxLength(512)
  token: string;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

class LogoutDto {
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authService: AuthService,
    @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.authService.register(
        dto.email,
        dto.password,
        dto.firstName,
        dto.lastName,
      );
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const result = await this.authService.login(loginDto.email, loginDto.password);
      reply.setCookie(COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        maxAge: ACCESS_COOKIE_MAX_AGE,
      });
      return result; // { token, refreshToken, user }
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  async refresh(
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.refresh(body.refreshToken);
    reply.setCookie(COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE,
    });
    return result; // { token, refreshToken }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return req.user;
  }

  @Patch('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    await this.userRepository.updateProfile(req.user.sub, {
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }

  @Patch('fcm-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async registerFcmToken(@Req() req: any, @Body() body: FcmTokenDto) {
    await this.userRepository.saveFcmToken(req.user.sub, body.token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() body: LogoutDto,
    @Req() req: any,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.authService.logout(body?.refreshToken);
    if (req.user?.sub) {
      await this.userRepository.clearFcmToken(req.user.sub).catch(() => {});
    }
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out' };
  }
}
```

- [ ] **Step 2: Verificar compilación y tests**

```bash
cd fruit-backend && pnpm run build 2>&1 | tail -10 && pnpm run test --no-coverage 2>&1 | tail -20
```

Resultado esperado: compilación exitosa y todos los tests existentes siguen pasando.

- [ ] **Step 3: Commit**

```bash
cd fruit-backend && git add src/auth/infrastructure/http/auth.controller.ts
git commit -m "feat(auth): add POST /auth/refresh endpoint and update logout to revoke server-side"
```

---

### Task 8: Flutter — AuthResultEntity y AuthResponseModel

**Files:**
- Modify: `zarza_ai/lib/domain/entities/auth_result_entity.dart`
- Modify: `zarza_ai/lib/data/models/auth_response_model.dart`

- [ ] **Step 1: Actualizar `AuthResultEntity` con campo `refreshToken`**

```dart
// zarza_ai/lib/domain/entities/auth_result_entity.dart
import 'package:equatable/equatable.dart';

import 'user_entity.dart';

class AuthResultEntity extends Equatable {
  const AuthResultEntity({
    required this.token,
    required this.refreshToken,
    required this.user,
  });

  final String token;
  final String refreshToken;
  final UserEntity user;

  @override
  List<Object?> get props => [token, refreshToken, user];
}
```

- [ ] **Step 2: Actualizar `AuthResponseModel` para parsear `refreshToken`**

```dart
// zarza_ai/lib/data/models/auth_response_model.dart
import '../../domain/entities/auth_result_entity.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';

class AuthResponseModel {
  const AuthResponseModel._({
    required this.token,
    required this.refreshToken,
    required this.user,
  });

  final String token;
  final String refreshToken;
  final UserEntity user;

  factory AuthResponseModel.fromJson(
    Map<String, dynamic> json, {
    UserEntity? fallbackUser,
  }) {
    final userJson = json['user'] as Map<String, dynamic>?;

    final UserEntity user;
    if (userJson != null) {
      user = UserEntity(
        id: userJson['id'] as String? ?? '',
        email: userJson['email'] as String? ?? '',
        role: UserRole.fromString(userJson['role'] as String? ?? 'MONITOR'),
        firstName: userJson['firstName'] as String?,
        lastName: userJson['lastName'] as String?,
      );
    } else if (fallbackUser != null) {
      user = fallbackUser;
    } else {
      user = const UserEntity(id: '', email: '', role: UserRole.monitor);
    }

    return AuthResponseModel._(
      token: json['token'] as String,
      refreshToken: json['refreshToken'] as String? ?? '',
      user: user,
    );
  }

  AuthResultEntity toEntity() => AuthResultEntity(
        token: token,
        refreshToken: refreshToken,
        user: user,
      );
}
```

- [ ] **Step 3: Verificar análisis estático**

```bash
cd zarza_ai && flutter analyze lib/domain/entities/auth_result_entity.dart lib/data/models/auth_response_model.dart
```

Resultado esperado: `No issues found!`

- [ ] **Step 4: Commit**

```bash
cd zarza_ai && git add lib/domain/entities/auth_result_entity.dart lib/data/models/auth_response_model.dart
git commit -m "feat(auth): add refreshToken field to AuthResultEntity and AuthResponseModel"
```

---

### Task 9: Flutter — LocalAuthDatasource

**Files:**
- Modify: `zarza_ai/lib/data/datasources/local_auth_datasource.dart`

- [ ] **Step 1: Reemplazar el contenido completo**

```dart
// zarza_ai/lib/data/datasources/local_auth_datasource.dart
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';

class LocalAuthDatasource {
  LocalAuthDatasource(this._storage);
  final FlutterSecureStorage _storage;

  static const _tokenKey = 'auth_token';
  static const _refreshTokenKey = 'auth_refresh_token';
  static const _userKey = 'auth_user';

  Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<String?> getToken() => _storage.read(key: _tokenKey);

  Future<void> deleteToken() => _storage.delete(key: _tokenKey);

  Future<void> saveRefreshToken(String token) =>
      _storage.write(key: _refreshTokenKey, value: token);

  Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> deleteRefreshToken() => _storage.delete(key: _refreshTokenKey);

  Future<void> saveUser(UserEntity user) async {
    final json = jsonEncode({
      'id': user.id,
      'email': user.email,
      'role': user.role.name.toUpperCase(),
      if (user.firstName != null) 'firstName': user.firstName,
      if (user.lastName != null) 'lastName': user.lastName,
    });
    await _storage.write(key: _userKey, value: json);
  }

  Future<UserEntity?> getUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null) return null;
    final map = jsonDecode(raw) as Map<String, dynamic>;
    return UserEntity(
      id: map['id'] as String,
      email: map['email'] as String,
      role: UserRole.fromString(map['role'] as String),
      firstName: map['firstName'] as String?,
      lastName: map['lastName'] as String?,
    );
  }

  Future<void> deleteUser() => _storage.delete(key: _userKey);

  Future<void> clearAll() async {
    await deleteToken();
    await deleteRefreshToken();
    await deleteUser();
  }
}
```

- [ ] **Step 2: Verificar análisis estático**

```bash
cd zarza_ai && flutter analyze lib/data/datasources/local_auth_datasource.dart
```

Resultado esperado: `No issues found!`

- [ ] **Step 3: Commit**

```bash
cd zarza_ai && git add lib/data/datasources/local_auth_datasource.dart
git commit -m "feat(auth): add saveRefreshToken/getRefreshToken to LocalAuthDatasource"
```

---

### Task 10: Flutter — AuthRepositoryImpl

**Files:**
- Modify: `zarza_ai/lib/data/repositories/auth_repository_impl.dart`

- [ ] **Step 1: Reemplazar el contenido completo**

```dart
// zarza_ai/lib/data/repositories/auth_repository_impl.dart
import 'package:dio/dio.dart';

import '../../domain/entities/auth_result_entity.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/i_auth_repository.dart';
import '../datasources/local_auth_datasource.dart';
import '../datasources/remote_auth_datasource.dart';

class AuthRepositoryImpl implements IAuthRepository {
  AuthRepositoryImpl({
    required RemoteAuthDatasource remote,
    required LocalAuthDatasource local,
    required Dio dio,
  })  : _remote = remote,
        _local = local,
        _dio = dio;

  final RemoteAuthDatasource _remote;
  final LocalAuthDatasource _local;
  final Dio _dio;

  @override
  Future<AuthResultEntity> login({
    required String email,
    required String password,
  }) async {
    final model = await _remote.login(email: email, password: password);
    final entity = model.toEntity();
    await _local.saveToken(entity.token);
    await _local.saveRefreshToken(entity.refreshToken);
    await _local.saveUser(entity.user);
    return entity;
  }

  @override
  Future<AuthResultEntity> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    final model = await _remote.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
    );
    final entity = model.toEntity();
    await _local.saveToken(entity.token);
    await _local.saveUser(entity.user);
    return entity;
  }

  @override
  Future<void> logout() async {
    final refreshToken = await _local.getRefreshToken();
    try {
      await _dio.post<void>(
        '/api/auth/logout',
        data: refreshToken != null ? {'refreshToken': refreshToken} : <String, dynamic>{},
      );
    } catch (_) {
      // Si el backend no responde, igual limpiamos el storage local
    }
    await _local.clearAll();
  }

  @override
  Future<String?> getStoredToken() => _local.getToken();

  @override
  Future<UserEntity?> getStoredUser() => _local.getUser();

  @override
  Future<UserEntity> updateProfile({
    String? firstName,
    String? lastName,
  }) async {
    await _dio.patch<void>(
      '/api/auth/profile',
      data: {
        'firstName': ?firstName,
        'lastName': ?lastName,
      },
    );
    final stored = await _local.getUser();
    if (stored == null) throw StateError('No authenticated user in local storage');
    final updated = UserEntity(
      id: stored.id,
      email: stored.email,
      role: stored.role,
      firstName: firstName ?? stored.firstName,
      lastName: lastName ?? stored.lastName,
    );
    await _local.saveUser(updated);
    return updated;
  }
}
```

- [ ] **Step 2: Verificar análisis estático**

```bash
cd zarza_ai && flutter analyze lib/data/repositories/auth_repository_impl.dart
```

Resultado esperado: `No issues found!`

- [ ] **Step 3: Commit**

```bash
cd zarza_ai && git add lib/data/repositories/auth_repository_impl.dart
git commit -m "feat(auth): save refresh token on login; revoke server-side on logout"
```

---

### Task 11: Flutter — AuthInterceptor con silent refresh

**Files:**
- Modify: `zarza_ai/lib/core/network/auth_interceptor.dart`
- Modify: `zarza_ai/lib/core/constants/app_constants.dart`

- [ ] **Step 1: Agregar `refreshEndpoint` a `AppConstants`**

En `zarza_ai/lib/core/constants/app_constants.dart`, agregar al bloque de Auth endpoints (después de `registerEndpoint`):

```dart
  static const String refreshEndpoint = '/api/auth/refresh';
```

- [ ] **Step 2: Reemplazar `AuthInterceptor`**

```dart
// zarza_ai/lib/core/network/auth_interceptor.dart
import 'package:dio/dio.dart';

import '../../data/datasources/local_auth_datasource.dart';
import '../auth/auth_cubit.dart';
import '../constants/app_constants.dart';
import '../di/service_locator.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._local);
  final LocalAuthDatasource _local;

  bool _isRefreshing = false;

  // Dio limpio sin interceptores para la llamada de refresh.
  // Usar el Dio principal crearía un bucle: el interceptor añadiría
  // el token caducado a la llamada de refresh, y un 401 re-entrante
  // volvería a disparar el interceptor indefinidamente.
  late final Dio _refreshDio = Dio(
    BaseOptions(baseUrl: AppConstants.baseUrl),
  );

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _local.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final isAuthEndpoint = err.requestOptions.path.contains('/auth/');

    if (err.response?.statusCode == 401 && !isAuthEndpoint) {
      if (_isRefreshing) {
        // Evitar loops: si ya estamos refrescando, hacer logout directo
        sl<AuthCubit>().logout();
        return handler.next(err);
      }

      final refreshToken = await _local.getRefreshToken();
      if (refreshToken == null) {
        sl<AuthCubit>().logout();
        return handler.next(err);
      }

      _isRefreshing = true;
      try {
        final response = await _refreshDio.post<Map<String, dynamic>>(
          AppConstants.refreshEndpoint,
          data: {'refreshToken': refreshToken},
        );
        final data = response.data!;
        await _local.saveToken(data['token'] as String);
        await _local.saveRefreshToken(data['refreshToken'] as String);

        // Reintentar la request original con el nuevo access token
        final retryOptions = err.requestOptions;
        retryOptions.headers['Authorization'] = 'Bearer ${data['token']}';
        final retryResponse = await _refreshDio.fetch<dynamic>(retryOptions);
        return handler.resolve(retryResponse);
      } catch (_) {
        sl<AuthCubit>().logout();
        return handler.next(err);
      } finally {
        _isRefreshing = false;
      }
    }

    handler.next(err);
  }
}
```

- [ ] **Step 3: Verificar que toda la app analiza sin errores**

```bash
cd zarza_ai && flutter analyze
```

Resultado esperado: `No issues found!` (o solo warnings pre-existentes, no errores nuevos).

- [ ] **Step 4: Commit**

```bash
cd zarza_ai && git add lib/core/network/auth_interceptor.dart lib/core/constants/app_constants.dart
git commit -m "feat(auth): implement silent refresh in AuthInterceptor with theft-safe fallback"
```

---

## Verificación Final

- [ ] Correr todos los tests del backend:

```bash
cd fruit-backend && pnpm run test --no-coverage
```

Resultado esperado: todos los tests pasan.

- [ ] Verificar compilación TypeScript completa:

```bash
cd fruit-backend && pnpm run build 2>&1 | tail -5
```

Resultado esperado: sin errores.

- [ ] Levantar el stack e intentar un login manual para confirmar que el response incluye `refreshToken`:

```bash
docker compose up mongo rabbitmq -d
cd fruit-backend && pnpm run start:dev
# En otra terminal:
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' | jq '.refreshToken'
```

Resultado esperado: una cadena base64url de ~43 caracteres.
