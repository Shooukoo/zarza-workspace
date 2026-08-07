# MongoDB → PostgreSQL Migration (RubusAI) — Implementation Plan

**Spec relacionado:** [[2026-05-07-mongodb-to-postgresql-migration-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all MongoDB/Mongoose code with PostgreSQL/Prisma across `fruit-backend` and `fruit-ms`, using a shared `@rubus/database` package that owns the Prisma schema and generated client.

**Architecture:** `packages/database` owns `schema.prisma`, runs migrations, generates the Prisma Client, and exports `PrismaService` + `DatabaseModule`. Both NestJS services declare it as a workspace dependency (`workspace:*`) and import from `@rubus/database`. Big bang: all Mongoose code is replaced in a single pass — no data to migrate.

**Tech Stack:** Prisma 6, PostgreSQL 16 (postgis/postgis:16-3.4-alpine image), pnpm workspaces, `@Global()` NestJS module.

> **API shape note:** Prisma uses camelCase JS property names. The JSON responses from all services will change from snake_case (e.g. `productor_id`) to camelCase (e.g. `productorId`). zarza-web and zarza_ai field references will need updating as a follow-up task after this migration.

---

## File Map

**Create:**
- `package.json` (workspace root) — pnpm workspace root manifest
- `pnpm-workspace.yaml` — declares monorepo packages
- `packages/database/package.json`
- `packages/database/tsconfig.json`
- `packages/database/.env`
- `packages/database/prisma/schema.prisma`
- `packages/database/src/prisma.service.ts`
- `packages/database/src/database.module.ts`
- `packages/database/src/index.ts`
- `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`
- `fruit-ms/src/fruits/infrastructure/analysis.prisma.repository.ts`

**Modify:**
- `docker-compose.yml` — replace mongo service with postgres
- `fruit-backend/.env` — swap `MONGO_URI` → `DATABASE_URL`
- `fruit-ms/.env` — swap `MONGO_URI` → `DATABASE_URL`
- `fruit-backend/package.json` — add `@rubus/database`, remove `@nestjs/mongoose` + `mongoose`
- `fruit-backend/Dockerfile` — build from workspace root
- `fruit-backend/src/config/envs.ts` — remove `MONGO_URI` validation
- `fruit-backend/src/app.module.ts` — replace `MongooseModule.forRoot` with `DatabaseModule`
- `fruit-backend/src/auth/infrastructure/auth.module.ts` — swap `MongooseUserRepository` → `PrismaUserRepository`, remove `MongooseModule.forFeature`
- `fruit-backend/src/campos/campos.service.ts` — rewrite with `PrismaService`
- `fruit-backend/src/campos/campos.module.ts` — remove `MongooseModule.forFeature`
- `fruit-backend/src/solicitudes/solicitudes.service.ts` — rewrite with `PrismaService`
- `fruit-backend/src/solicitudes/solicitudes.module.ts` — remove `MongooseModule.forFeature`
- `fruit-backend/src/analyses/analyses.service.ts` — rewrite with `PrismaService`
- `fruit-backend/src/analyses/analyses.controller.ts` — update field names (camelCase)
- `fruit-backend/src/analyses/analyses.module.ts` — remove `MongooseModule.forFeature`
- `fruit-backend/src/admin/admin.service.ts` — rewrite with `PrismaService`
- `fruit-backend/src/admin/admin-dashboard.service.ts` — rewrite aggregations with Prisma
- `fruit-backend/src/admin/admin.module.ts` — remove `MongooseModule.forFeature`
- `fruit-ms/package.json` — add `@rubus/database`, remove `@nestjs/mongoose` + `mongoose`
- `fruit-ms/Dockerfile` — build from workspace root
- `fruit-ms/src/config/envs.ts` — remove `MONGO_URI` validation
- `fruit-ms/src/database/database.module.ts` — import `DatabaseModule` from `@rubus/database`
- `fruit-ms/src/fruits/fruits.module.ts` — swap `MongoAnalysisRepository` → `PrismaAnalysisRepository`

**Delete:**
- `fruit-backend/src/auth/infrastructure/schemas/user.schema.ts`
- `fruit-backend/src/campos/schemas/campo.schema.ts`
- `fruit-backend/src/solicitudes/schemas/solicitud-muestreo.schema.ts`
- `fruit-backend/src/analyses/analyses.schema.ts`
- `fruit-backend/src/admin/schemas/analysis.schema.ts`
- `fruit-ms/src/fruits/schemas/analysis.schema.ts`
- `fruit-ms/src/fruits/infrastructure/analysis.mongoose.repository.ts`

---

## Task 1: pnpm Workspace Root + Docker Infrastructure

**Files:**
- Create: `package.json` (workspace root)
- Create: `pnpm-workspace.yaml`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Create workspace root `package.json`**

```json
{
  "name": "rubusai",
  "version": "0.0.0",
  "private": true,
  "engines": {
    "node": ">=22",
    "pnpm": ">=9"
  }
}
```

Save to: `package.json` (monorepo root, next to `docker-compose.yml`)

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'fruit-backend'
  - 'fruit-ms'
  - 'packages/*'
```

Save to: `pnpm-workspace.yaml` (monorepo root)

- [ ] **Step 3: Replace mongo with postgres in `docker-compose.yml`**

Replace the entire `mongo:` service block:

```yaml
  mongo:
    image: mongo:7
    ports:
      - "127.0.0.1:27018:27017"
    volumes:
      - mongo-data:/data/db
    networks: [fruit-net]
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
```

With:

```yaml
  postgres:
    image: postgis/postgis:16-3.4-alpine
    environment:
      POSTGRES_DB: rubusai
      POSTGRES_USER: rubus
      POSTGRES_PASSWORD: rubus_dev
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rubus -d rubusai"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [fruit-net]
```

- [ ] **Step 4: Update `fruit-backend` service in `docker-compose.yml`**

Replace:

```yaml
  fruit-backend:
    build: ./fruit-backend
    ports:
      - "3001:3000"
    env_file: ./fruit-backend/.env
    environment:
      MONGO_URI: "mongodb://mongo:27017/fruit_db"
      RABBITMQ_URL: "amqp://guest:guest@rabbitmq:5672"
    depends_on:
      rabbitmq:
        condition: service_healthy
      mongo:
        condition: service_healthy
    networks: [fruit-net]
```

With:

```yaml
  fruit-backend:
    build:
      context: .
      dockerfile: fruit-backend/Dockerfile
    ports:
      - "3001:3000"
    env_file: ./fruit-backend/.env
    environment:
      DATABASE_URL: "postgresql://rubus:rubus_dev@postgres:5432/rubusai"
      RABBITMQ_URL: "amqp://guest:guest@rabbitmq:5672"
    depends_on:
      rabbitmq:
        condition: service_healthy
      postgres:
        condition: service_healthy
    networks: [fruit-net]
```

- [ ] **Step 5: Update `fruit-ms` service in `docker-compose.yml`**

Replace:

```yaml
  fruit-ms:
    build: ./fruit-ms
    env_file: ./fruit-ms/.env
    environment:
      RABBITMQ_URL: "amqp://guest:guest@rabbitmq:5672"
      INFERENCE_URL: "http://fruit-inference:8000"
      MONGO_URI: "mongodb://mongo:27017/fruit_db"
    depends_on:
      rabbitmq:
        condition: service_healthy
      fruit-inference:
        condition: service_healthy
      mongo:
        condition: service_healthy
    networks: [fruit-net]
```

With:

```yaml
  fruit-ms:
    build:
      context: .
      dockerfile: fruit-ms/Dockerfile
    env_file: ./fruit-ms/.env
    environment:
      RABBITMQ_URL: "amqp://guest:guest@rabbitmq:5672"
      INFERENCE_URL: "http://fruit-inference:8000"
      DATABASE_URL: "postgresql://rubus:rubus_dev@postgres:5432/rubusai"
    depends_on:
      rabbitmq:
        condition: service_healthy
      fruit-inference:
        condition: service_healthy
      postgres:
        condition: service_healthy
    networks: [fruit-net]
```

- [ ] **Step 6: Update `volumes` block in `docker-compose.yml`**

Replace:

```yaml
volumes:
  mongo-data:
```

With:

```yaml
volumes:
  postgres_data:
```

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml docker-compose.yml
git commit -m "infra: replace MongoDB with PostgreSQL in docker-compose, add pnpm workspace root"
```

---

## Task 2: Create `packages/database` Package

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/.env`
- Create: `packages/database/prisma/schema.prisma`
- Create: `packages/database/src/prisma.service.ts`
- Create: `packages/database/src/database.module.ts`
- Create: `packages/database/src/index.ts`

- [ ] **Step 1: Create `packages/database/package.json`**

```json
{
  "name": "@rubus/database",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "prisma generate && tsc",
    "generate": "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@prisma/client": "^6.0.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/database/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "declaration": true,
    "declarationMap": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/database/.env`**

```
DATABASE_URL="postgresql://rubus:rubus_dev@localhost:5432/rubusai"
```

This file is used by `prisma migrate dev` when run locally. Do not commit it — add to `.gitignore` if needed.

- [ ] **Step 4: Create `packages/database/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  PRODUCTOR
  AGRONOMO
  MONITOR
}

enum EstadoSolicitud {
  PENDIENTE
  EN_PROGRESO
  COMPLETADO
  CANCELADO
}

enum EstadoValidacion {
  pendiente
  validado
  rechazado
}

model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role
  fcmToken     String?  @map("fcm_token")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  camposAsignados      UserCampo[]
  camposProductor      Campo[]             @relation("CampoProductor")
  solicitudesCreadas   SolicitudMuestreo[] @relation("SolicitudCreadoPor")
  solicitudesAsignadas SolicitudMuestreo[] @relation("SolicitudAsignadoA")
  analysesAsRequester  Analysis[]          @relation("AnalysisRequester")
  analysesAsProductor  Analysis[]          @relation("AnalysisProductor")
  analysesValidadas    Analysis[]          @relation("AnalysisValidador")

  @@map("users")
}

model Campo {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  codigoCampo String   @map("codigo_campo")
  nombre      String
  productorId String   @map("productor_id") @db.Uuid
  poligonoGps Json?    @map("poligono_gps")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  productor   User                @relation("CampoProductor", fields: [productorId], references: [id])
  usuarios    UserCampo[]
  solicitudes SolicitudMuestreo[]
  analyses    Analysis[]

  @@map("campos")
}

model UserCampo {
  userId  String @map("user_id") @db.Uuid
  campoId String @map("campo_id") @db.Uuid

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  campo Campo @relation(fields: [campoId], references: [id], onDelete: Cascade)

  @@id([userId, campoId])
  @@map("user_campos")
}

model SolicitudMuestreo {
  id          String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  creadoPorId String          @map("creado_por_id") @db.Uuid
  asignadoAId String          @map("asignado_a_id") @db.Uuid
  campoId     String          @map("campo_id") @db.Uuid
  mensaje     String
  estado      EstadoSolicitud @default(PENDIENTE)
  fechaLimite DateTime?       @map("fecha_limite")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  creadoPor User  @relation("SolicitudCreadoPor", fields: [creadoPorId], references: [id])
  asignadoA User  @relation("SolicitudAsignadoA", fields: [asignadoAId], references: [id])
  campo     Campo @relation(fields: [campoId], references: [id])

  @@map("solicitudes_muestreo")
}

model Analysis {
  id                            String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  imageId                       String           @unique @map("image_id")
  storageKey                    String           @map("storage_key")
  requesterUserId               String           @map("requester_user_id") @db.Uuid
  requesterEmail                String           @map("requester_email")
  variedad                      String?
  fechaAnalisis                 DateTime         @map("fecha_analisis")
  totalElementosDetectados      Int              @map("total_elementos_detectados")
  elementosSanos                Int              @map("elementos_sanos")
  elementosEnfermos             Int              @map("elementos_enfermos")
  porcentajeMermaGeneral        Float            @map("porcentaje_merma_general")
  pesoSanoGramos                Float            @map("peso_sano_gramos")
  ubicacionLat                  Float?           @map("ubicacion_lat")
  ubicacionLng                  Float?           @map("ubicacion_lng")
  campoId                       String           @map("campo_id") @db.Uuid
  productorId                   String           @map("productor_id") @db.Uuid
  offlineSyncId                 String?          @unique @map("offline_sync_id")
  validacionEstado              EstadoValidacion  @default(pendiente) @map("validacion_estado")
  validacionFueCorregido        Boolean           @default(false) @map("validacion_fue_corregido")
  validacionCorregidoPorId      String?           @map("validacion_corregido_por_id") @db.Uuid
  validacionDiagnosticoOriginal String?           @map("validacion_diagnostico_original")
  validacionCronogramaCorregido Json?             @map("validacion_cronograma_corregido")
  validacionObservaciones       String?           @map("validacion_observaciones")
  createdAt                     DateTime          @default(now()) @map("created_at")
  updatedAt                     DateTime          @updatedAt @map("updated_at")

  requester       User             @relation("AnalysisRequester", fields: [requesterUserId], references: [id])
  productor       User             @relation("AnalysisProductor", fields: [productorId], references: [id])
  campo           Campo            @relation(fields: [campoId], references: [id])
  validadoPor     User?            @relation("AnalysisValidador", fields: [validacionCorregidoPorId], references: [id])
  fenologiaEtapas FenologiaEtapa[]

  @@map("analyses")
}

model FenologiaEtapa {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  analysisId      String   @map("analysis_id") @db.Uuid
  etapa           String
  cantidad        Int
  cambiaA         String   @map("cambia_a")
  enDias          Int      @map("en_dias")
  diasParaCosecha Int      @map("dias_para_cosecha")

  analysis Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@map("fenologia_etapas")
}
```

> **Schema note:** `validacionCronogramaCorregido` (Json) and `validacionObservaciones` (String) are additions to the spec — they preserve the existing "reject with correction" feature that stores a corrected fenological schedule.

- [ ] **Step 5: Create `packages/database/src/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from './generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 6: Create `packages/database/src/database.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

- [ ] **Step 7: Create `packages/database/src/index.ts`**

```typescript
export { PrismaService } from './prisma.service';
export { DatabaseModule } from './database.module';
export * from './generated/client';
```

- [ ] **Step 8: Commit**

```bash
git add packages/
git commit -m "feat(database): add @rubus/database shared package with schema.prisma and PrismaService"
```

---

## Task 3: Install Dependencies, Generate Prisma Client, Run Migration

**Prerequisites:** Docker running on your machine.

- [ ] **Step 1: Install workspace dependencies from root**

Run from the monorepo root (same directory as `pnpm-workspace.yaml`):

```bash
pnpm install
```

Expected: pnpm links `packages/database` → `fruit-backend/node_modules/@rubus/database` and `fruit-ms/node_modules/@rubus/database`. No errors.

- [ ] **Step 2: Start PostgreSQL**

```bash
docker compose up postgres -d
```

Expected output: `Container ... Started`. Wait ~5 seconds for the healthcheck to pass.

Verify it's healthy:

```bash
docker compose ps postgres
```

Expected: `Status` column shows `healthy`.

- [ ] **Step 3: Generate Prisma client**

```bash
cd packages/database
pnpm exec prisma generate
```

Expected: Prisma outputs something like:
```
✔ Generated Prisma Client (v6.x.x) to ./src/generated/client
```

The directory `packages/database/src/generated/client/` is now populated.

- [ ] **Step 4: Run initial migration**

Still inside `packages/database/`:

```bash
pnpm exec prisma migrate dev --name init
```

Expected: Prisma reads `.env`, connects to `postgresql://rubus:rubus_dev@localhost:5432/rubusai`, applies the migration. Output ends with:
```
✔ Generated Prisma Client (v6.x.x) to ./src/generated/client
Your database is now in sync with your schema.
```

A file `packages/database/prisma/migrations/20260508_init/migration.sql` is created.

- [ ] **Step 5: Build `@rubus/database` (compile TypeScript)**

Still inside `packages/database/`:

```bash
pnpm run build
```

Expected: `tsc` outputs to `packages/database/dist/`. No errors.

- [ ] **Step 6: Return to monorepo root**

```bash
cd ../..
```

- [ ] **Step 7: Commit**

```bash
git add packages/database/prisma/migrations/ packages/database/src/generated/
git commit -m "feat(database): add initial Prisma migration and generated client"
```

> Note: commit the generated client (`src/generated/`) so services can compile without running `prisma generate` first. Add `packages/database/dist/` to `.gitignore` — it's rebuilt at deploy time.

---

## Task 4: Wire `fruit-backend` into Workspace + Remove Mongoose

**Files:**
- Modify: `fruit-backend/package.json`
- Modify: `fruit-backend/src/config/envs.ts`
- Modify: `fruit-backend/src/app.module.ts`

- [ ] **Step 1: Update `fruit-backend/package.json`**

Open `fruit-backend/package.json`. In the `dependencies` object:

1. Add: `"@rubus/database": "workspace:*"`
2. Remove: `"@nestjs/mongoose": "^11.0.4"`
3. Remove: `"mongoose": "^9.3.0"`

Run from monorepo root to update lockfile:

```bash
pnpm install
```

Expected: no errors. `fruit-backend/node_modules/@rubus/database` symlink confirmed.

- [ ] **Step 2: Update `fruit-backend/src/config/envs.ts`**

Replace the entire file:

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
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  FIREBASE_SERVICE_ACCOUNT_B64: string;
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
    JWT_EXPIRES_IN: joi.string().required(),
    CORS_ORIGIN: joi.string().optional().default('http://localhost:5173'),
    FIREBASE_SERVICE_ACCOUNT_B64: joi.string().required(),
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
  jwtExpiresIn: envVars.JWT_EXPIRES_IN,
  corsOrigin: envVars.CORS_ORIGIN,
  firebaseServiceAccountB64: envVars.FIREBASE_SERVICE_ACCOUNT_B64,
};
```

> `DATABASE_URL` is read directly by Prisma from the environment — no need to validate it here.

- [ ] **Step 3: Update `fruit-backend/.env`**

Remove the `MONGO_URI=...` line. Add:

```
DATABASE_URL="postgresql://rubus:rubus_dev@localhost:5432/rubusai"
```

- [ ] **Step 4: Update `fruit-backend/src/app.module.ts`**

Replace the entire file:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@rubus/database';
import { IngestionModule } from './ingestion/ingestion.module';
import { FruitsQueryModule } from './fruits-query/fruits-query.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/infrastructure/auth.module';
import { AdminModule } from './admin/admin.module';
import { CamposModule } from './campos/campos.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { AnalysesModule } from './analyses/analyses.module';
import { FcmModule } from './fcm/fcm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
    FcmModule,
    AuthModule,
    AdminModule,
    IngestionModule,
    FruitsQueryModule,
    NotificationsModule,
    CamposModule,
    SolicitudesModule,
    AnalysesModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/package.json fruit-backend/src/config/envs.ts fruit-backend/src/app.module.ts fruit-backend/.env
git commit -m "feat(fruit-backend): wire @rubus/database, replace MongooseModule with DatabaseModule"
```

---

## Task 5: Migrate `fruit-backend` — Auth Module

**Files:**
- Create: `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`
- Delete: `fruit-backend/src/auth/infrastructure/schemas/user.schema.ts`
- Modify: `fruit-backend/src/auth/infrastructure/auth.module.ts`

- [ ] **Step 1: Create `prisma-user.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, CreateUserData, UserCampos } from '../../ports/user-repository.port';
import { Role } from '../../domain/enums/role.enum';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!doc) return null;
    return new User(doc.id, doc.email, doc.passwordHash, doc.role as Role);
  }

  async save(data: CreateUserData): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
    });
    return new User(created.id, created.email, created.passwordHash, created.role as Role);
  }

  async findById(id: string): Promise<UserCampos | null> {
    const doc = await this.prisma.user.findUnique({
      where: { id },
      include: { camposAsignados: { select: { campoId: true } } },
    });
    if (!doc) return null;
    return {
      id: doc.id,
      camposAsignados: doc.camposAsignados.map((uc) => uc.campoId),
    };
  }

  async findFcmTokenById(userId: string): Promise<string | null> {
    const doc = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    return doc?.fcmToken ?? null;
  }

  async clearFcmToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
  }
}
```

- [ ] **Step 2: Update `fruit-backend/src/auth/infrastructure/auth.module.ts`**

Replace the entire file:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController, AUTH_SERVICE } from './http/auth.controller';
import { AuthService } from '../application/auth.service';
import { I_USER_REPOSITORY } from '../ports/user-repository.port';
import { I_HASHER_PORT } from '../ports/hasher.port';
import { I_TOKEN_PORT } from '../ports/token.port';
import { PrismaUserRepository } from './adapters/prisma-user.repository';
import { BcryptHasher } from './adapters/bcrypt-hasher.adapter';
import { JwtTokenService } from './adapters/jwt-token.adapter';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: I_USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: I_HASHER_PORT, useClass: BcryptHasher },
    { provide: I_TOKEN_PORT, useClass: JwtTokenService },
    {
      provide: AUTH_SERVICE,
      useFactory: (userRepo, hasher, tokenPort) => new AuthService(userRepo, hasher, tokenPort),
      inject: [I_USER_REPOSITORY, I_HASHER_PORT, I_TOKEN_PORT],
    },
  ],
  exports: [I_TOKEN_PORT, I_HASHER_PORT, I_USER_REPOSITORY],
})
export class AuthModule {}
```

- [ ] **Step 3: Delete `fruit-backend/src/auth/infrastructure/schemas/user.schema.ts`**

```bash
rm fruit-backend/src/auth/infrastructure/schemas/user.schema.ts
```

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/auth/
git commit -m "feat(fruit-backend/auth): replace MongooseUserRepository with PrismaUserRepository"
```

---

## Task 6: Migrate `fruit-backend` — Campos Module

**Files:**
- Modify: `fruit-backend/src/campos/campos.service.ts`
- Modify: `fruit-backend/src/campos/campos.module.ts`
- Delete: `fruit-backend/src/campos/schemas/campo.schema.ts`

- [ ] **Step 1: Replace `fruit-backend/src/campos/campos.service.ts`**

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { CreateCampoDto } from './dto/create-campo.dto';

@Injectable()
export class CamposService {
  private readonly logger = new Logger(CamposService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCampoDto) {
    this.logger.log(`Creando campo: ${dto.codigo_campo}`);
    return this.prisma.campo.create({
      data: {
        codigoCampo: dto.codigo_campo,
        nombre: dto.nombre,
        productorId: dto.productor_id,
        poligonoGps: dto.poligono_gps ?? [],
      },
    });
  }

  async findAll(productorId?: string) {
    return this.prisma.campo.findMany({
      where: productorId ? { productorId } : undefined,
    });
  }

  async findByIds(ids: string[]) {
    if (!ids.length) return [];
    return this.prisma.campo.findMany({ where: { id: { in: ids } } });
  }

  async findById(id: string) {
    const campo = await this.prisma.campo.findUnique({ where: { id } });
    if (!campo) throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    return campo;
  }

  async delete(id: string): Promise<void> {
    const result = await this.prisma.campo.deleteMany({ where: { id } });
    if (result.count === 0) throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    this.logger.log(`Campo eliminado: ${id}`);
  }
}
```

- [ ] **Step 2: Replace `fruit-backend/src/campos/campos.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { CamposController } from './campos.controller';
import { CamposService } from './campos.service';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CamposController],
  providers: [CamposService],
  exports: [CamposService],
})
export class CamposModule {}
```

- [ ] **Step 3: Delete the schema**

```bash
rm fruit-backend/src/campos/schemas/campo.schema.ts
```

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/campos/
git commit -m "feat(fruit-backend/campos): replace Mongoose model with PrismaService"
```

---

## Task 7: Migrate `fruit-backend` — Solicitudes Module

**Files:**
- Modify: `fruit-backend/src/solicitudes/solicitudes.service.ts`
- Modify: `fruit-backend/src/solicitudes/solicitudes.module.ts`
- Delete: `fruit-backend/src/solicitudes/schemas/solicitud-muestreo.schema.ts`

- [ ] **Step 1: Replace `fruit-backend/src/solicitudes/solicitudes.service.ts`**

```typescript
import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService, EstadoSolicitud } from '@rubus/database';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { FcmService, FcmTokenInvalidError, FcmNotification } from '../fcm/fcm.service';
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';
import { CamposService } from '../campos/campos.service';

@Injectable()
export class SolicitudesService {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly fcmService: FcmService,
    @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly camposService: CamposService,
  ) {}

  async create(creadoPorId: string, dto: CreateSolicitudDto) {
    this.logger.log(
      `Creando solicitud para campo=${dto.campo_id} asignado_a=${dto.asignado_a}`,
    );

    const solicitud = await this.prisma.solicitudMuestreo.create({
      data: {
        creadoPorId,
        asignadoAId: dto.asignado_a,
        campoId: dto.campo_id,
        mensaje: dto.mensaje,
        fechaLimite: dto.fecha_limite ? new Date(dto.fecha_limite) : null,
        estado: 'PENDIENTE',
      },
    });

    this.notificationsGateway.broadcast('nueva_solicitud', {
      solicitud_id: solicitud.id,
      asignado_a: dto.asignado_a,
      campo_id: dto.campo_id,
      mensaje: dto.mensaje,
    });

    await this.sendSolicitudPush(dto.asignado_a, dto.campo_id, dto.fecha_limite ?? null, 'created');
    return solicitud;
  }

  async findAll(
    page = 1,
    limit = 20,
    filters: { estado?: EstadoSolicitud; campo_id?: string; asignado_a?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where: { estado?: EstadoSolicitud; campoId?: string; asignadoAId?: string } = {};

    if (filters.estado)    where.estado     = filters.estado;
    if (filters.campo_id)  where.campoId    = filters.campo_id;
    if (filters.asignado_a) where.asignadoAId = filters.asignado_a;

    const include = {
      campo:    { select: { id: true, nombre: true, codigoCampo: true } },
      asignadoA: { select: { id: true, email: true } },
    };

    const [data, total] = await Promise.all([
      this.prisma.solicitudMuestreo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include,
      }),
      this.prisma.solicitudMuestreo.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async updateEstado(id: string, estado: EstadoSolicitud) {
    const existing = await this.prisma.solicitudMuestreo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Solicitud con id "${id}" no encontrada`);

    const updated = await this.prisma.solicitudMuestreo.update({
      where: { id },
      data: { estado },
      include: {
        campo:    { select: { id: true, nombre: true, codigoCampo: true } },
        asignadoA: { select: { id: true, email: true } },
      },
    });

    this.logger.log(`Solicitud ${id} → estado: ${estado}`);

    if (estado === 'CANCELADO' || estado === 'COMPLETADO') {
      await this.sendSolicitudPush(
        updated.asignadoAId,
        updated.campoId,
        null,
        estado === 'CANCELADO' ? 'cancelled' : 'completed',
      );
    }

    return updated;
  }

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

    const formatFecha = (fl: string | Date | null | undefined): string => {
      if (!fl) return 'sin fecha';
      const d = fl instanceof Date ? fl : new Date(fl.toString().replace(/-/g, '/'));
      return d.toLocaleDateString('es-ES');
    };

    const notifications: Record<typeof event, FcmNotification> = {
      created: {
        title: `Nueva solicitud: ${campoNombre}`,
        body: `Fecha límite: ${formatFecha(fechaLimite)}. Abre la app para ver detalles.`,
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
}
```

- [ ] **Step 2: Replace `fruit-backend/src/solicitudes/solicitudes.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CamposModule } from '../campos/campos.module';

@Module({
  imports: [AuthModule, NotificationsModule, CamposModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
```

- [ ] **Step 3: Delete the schema**

```bash
rm fruit-backend/src/solicitudes/schemas/solicitud-muestreo.schema.ts
```

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/solicitudes/
git commit -m "feat(fruit-backend/solicitudes): replace Mongoose model with PrismaService"
```

---

## Task 8: Migrate `fruit-backend` — Analyses Module

**Files:**
- Modify: `fruit-backend/src/analyses/analyses.service.ts`
- Modify: `fruit-backend/src/analyses/analyses.controller.ts`
- Modify: `fruit-backend/src/analyses/analyses.module.ts`
- Delete: `fruit-backend/src/analyses/analyses.schema.ts`

- [ ] **Step 1: Replace `fruit-backend/src/analyses/analyses.service.ts`**

```typescript
import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService, EstadoValidacion } from '@rubus/database';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { STORAGE_PORT, type IStoragePort } from '../storage/ports';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { Role } from '../auth/domain/enums/role.enum';

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT)
    private readonly storage: IStoragePort,
  ) {}

  async findAll(
    page: number,
    limit: number,
    estado: 'pendiente' | 'validado' | 'rechazado' | 'all',
    scope: UserScope,
    campoId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (estado !== 'all') {
      where.validacionEstado = estado as EstadoValidacion;
    }

    if (scope.role === Role.PRODUCTOR) {
      where.productorId = scope.sub;
    }
    if (scope.role === Role.AGRONOMO && scope.camposAsignados?.length) {
      where.campoId = { in: scope.camposAsignados };
    }

    if (campoId) {
      where.campoId = campoId;
    }

    const [data, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where,
        orderBy: { fechaAnalisis: 'desc' },
        skip,
        take: limit,
        include: { fenologiaEtapas: true },
      }),
      this.prisma.analysis.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: { fenologiaEtapas: true },
    });
    if (!analysis) throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    return analysis;
  }

  async getImageUrl(id: string): Promise<string> {
    const analysis = await this.findById(id);
    if (!analysis.storageKey) {
      throw new NotFoundException(`El análisis ${id} no tiene imagen asociada`);
    }
    return this.storage.getPresignedUrl(analysis.storageKey, 900);
  }

  async validate(id: string, corregidoPorId: string, dto: ValidateAnalysisDto) {
    const existing = await this.findById(id);

    const diagnosticoOriginal = existing.validacionFueCorregido
      ? existing.validacionDiagnosticoOriginal
      : JSON.stringify(existing.fenologiaEtapas);

    const updated = await this.prisma.analysis.update({
      where: { id },
      data: {
        validacionEstado: dto.action as EstadoValidacion,
        validacionCorregidoPorId: corregidoPorId,
        ...(dto.action === 'rechazado' && dto.cronograma_corregido?.length
          ? {
              validacionFueCorregido: true,
              validacionDiagnosticoOriginal: diagnosticoOriginal,
              validacionCronogramaCorregido: dto.cronograma_corregido,
              validacionObservaciones: dto.observaciones ?? '',
            }
          : {}),
      },
      include: { fenologiaEtapas: true },
    });

    this.logger.log(`Análisis ${id} ${dto.action} por usuario ${corregidoPorId}`);
    return updated;
  }
}
```

- [ ] **Step 2: Update `fruit-backend/src/analyses/analyses.controller.ts`**

Update three field references (Mongoose ObjectId strings → Prisma UUID strings). Replace the entire file:

```typescript
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { AnalysesService } from './analyses.service';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Controller('analyses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalysesController {
  constructor(
    private readonly analysesService: AnalysesService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findAll(
    @Req() req: { user: JwtPayload },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('estado') estadoParam?: string,
    @Query('campo_id') campoId?: string,
  ) {
    let estado: 'pendiente' | 'validado' | 'rechazado' | 'all' = 'pendiente';
    if (estadoParam === 'validado') estado = 'validado';
    else if (estadoParam === 'rechazado') estado = 'rechazado';
    else if (estadoParam === 'all') estado = 'all';
    else if (estadoParam !== undefined && estadoParam !== 'pendiente') {
      throw new BadRequestException('estado must be pendiente, validado, rechazado, or all');
    }
    const scope = await this.buildScope(req.user);
    return this.analysesService.findAll(page, limit, estado, scope, campoId);
  }

  @Get(':id/image')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async getImage(@Param('id') id: string) {
    const url = await this.analysesService.getImageUrl(id);
    return { url };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findOne(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    if (scope.role === Role.PRODUCTOR && analysis.productorId !== scope.sub) {
      throw new NotFoundException();
    }
    if (
      scope.role === Role.AGRONOMO &&
      scope.camposAsignados?.length &&
      !scope.camposAsignados.includes(analysis.campoId ?? '')
    ) {
      throw new NotFoundException();
    }
    return analysis;
  }

  @Patch(':id/validate')
  @Roles(Role.AGRONOMO, Role.ADMIN)
  async validate(
    @Param('id') id: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: ValidateAnalysisDto,
  ) {
    const result = await this.analysesService.validate(id, req.user.sub, dto);
    this.notificationsGateway.broadcast('analysis_validated', {
      analysisId: id,
      action: dto.action,
      validatedBy: req.user.email,
      productorId: result.productorId,
    });
    return result;
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
    if (jwtUser.role === Role.AGRONOMO) {
      const user = await this.userRepository.findById(jwtUser.sub);
      return {
        role: jwtUser.role,
        sub: jwtUser.sub,
        camposAsignados: user?.camposAsignados ?? [],
      };
    }
    return { role: jwtUser.role, sub: jwtUser.sub };
  }
}
```

- [ ] **Step 3: Replace `fruit-backend/src/analyses/analyses.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, StorageModule, NotificationsModule],
  controllers: [AnalysesController],
  providers: [AnalysesService],
})
export class AnalysesModule {}
```

- [ ] **Step 4: Delete the Mongoose schema**

```bash
rm fruit-backend/src/analyses/analyses.schema.ts
```

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/analyses/
git commit -m "feat(fruit-backend/analyses): replace Mongoose model with PrismaService"
```

---

## Task 9: Migrate `fruit-backend` — Admin Module

**Files:**
- Modify: `fruit-backend/src/admin/admin.service.ts`
- Modify: `fruit-backend/src/admin/admin-dashboard.service.ts`
- Modify: `fruit-backend/src/admin/admin.module.ts`
- Delete: `fruit-backend/src/admin/schemas/analysis.schema.ts`

- [ ] **Step 1: Replace `fruit-backend/src/admin/admin.service.ts`**

```typescript
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService, Role as PrismaRole } from '@rubus/database';
import { Role } from '../auth/domain/enums/role.enum';
import { I_HASHER_PORT } from '../auth/ports/hasher.port';
import type { IHasherPort } from '../auth/ports/hasher.port';
import { UserAlreadyExistsError } from '../auth/domain/errors/auth.errors';

export interface UserSummary {
  id: string;
  email: string;
  role: Role;
  campos_asignados: string[];
  createdAt: Date;
  totalAnalyses?: number;
}

export interface AdminStats {
  totalUsers: number;
  usersByRole: Record<Role, number>;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(I_HASHER_PORT) private readonly hasher: IHasherPort,
  ) {}

  async findAllUsers(
    page = 1,
    limit = 20,
    role?: Role,
  ): Promise<{ data: UserSummary[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const where = role ? { role: role as PrismaRole } : {};

    const [docs, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          camposAsignados: { select: { campoId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const analysisCounts = await this.prisma.analysis.groupBy({
      by: ['requesterUserId'],
      _count: { id: true },
    });
    const countMap = new Map(analysisCounts.map((r) => [r.requesterUserId, r._count.id]));

    const data: UserSummary[] = docs.map((d) => ({
      id: d.id,
      email: d.email,
      role: d.role as Role,
      createdAt: d.createdAt,
      campos_asignados: d.camposAsignados.map((uc) => uc.campoId),
      totalAnalyses: countMap.get(d.id) ?? 0,
    }));

    return { data, total, page, limit };
  }

  async updateUserRole(userId: string, role: Role): Promise<UserSummary> {
    const doc = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as PrismaRole },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return { id: doc.id, email: doc.email, role: doc.role as Role, createdAt: doc.createdAt, campos_asignados: [] };
  }

  async getStats(): Promise<AdminStats> {
    const roleCounts = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });
    const usersByRole = Object.values(Role).reduce(
      (acc, r) => ({ ...acc, [r]: 0 }),
      {} as Record<Role, number>,
    );
    for (const { role, _count } of roleCounts) {
      usersByRole[role as Role] = _count.id;
    }
    return {
      totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
      usersByRole,
    };
  }

  async createUser(email: string, plainPassword: string, role: Role): Promise<UserSummary> {
    if (role === Role.ADMIN) throw new Error('No se puede crear usuarios con rol ADMIN');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UserAlreadyExistsError(email);
    const passwordHash = await this.hasher.hash(plainPassword);
    const created = await this.prisma.user.create({
      data: { email, passwordHash, role: role as PrismaRole },
    });
    return {
      id: created.id,
      email: created.email,
      role: created.role as Role,
      createdAt: created.createdAt,
      campos_asignados: [],
      totalAnalyses: 0,
    };
  }

  async updateCampos(userId: string, camposIds: string[]): Promise<UserSummary> {
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) throw new BadRequestException(`User ${userId} not found`);

    await this.prisma.$transaction([
      this.prisma.userCampo.deleteMany({ where: { userId } }),
      this.prisma.userCampo.createMany({
        data: camposIds.map((campoId) => ({ userId, campoId })),
      }),
    ]);

    const doc = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return {
      id: doc!.id,
      email: doc!.email,
      role: doc!.role as Role,
      createdAt: doc!.createdAt,
      campos_asignados: camposIds,
    };
  }

  async deleteUser(userId: string, requesterId: string): Promise<void> {
    if (userId === requesterId) throw new BadRequestException('No puedes eliminar tu propio usuario');
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async updatePassword(userId: string, plainPassword: string): Promise<void> {
    const passwordHash = await this.hasher.hash(plainPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
```

- [ ] **Step 2: Replace `fruit-backend/src/admin/admin-dashboard.service.ts`**

The MongoDB aggregations are replaced with Prisma `aggregate` / `groupBy`, plus `$queryRaw` for JOIN-based aggregations (Prisma's `groupBy` cannot filter across relations).

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getYieldForecast(productorId?: string) {
    type Row = { daysToHarvest: number; estimatedWeightGrams: number };
    const rows: Row[] = productorId
      ? await this.prisma.$queryRaw`
          SELECT fe.dias_para_cosecha     AS "daysToHarvest",
                 COALESCE(SUM(a.peso_sano_gramos), 0) AS "estimatedWeightGrams"
          FROM   fenologia_etapas fe
          JOIN   analyses a ON a.id = fe.analysis_id
          WHERE  (fe.etapa = 'maduro' OR fe.cambia_a = 'maduro')
            AND  a.productor_id = ${productorId}::uuid
          GROUP BY fe.dias_para_cosecha
          ORDER BY fe.dias_para_cosecha ASC`
      : await this.prisma.$queryRaw`
          SELECT fe.dias_para_cosecha     AS "daysToHarvest",
                 COALESCE(SUM(a.peso_sano_gramos), 0) AS "estimatedWeightGrams"
          FROM   fenologia_etapas fe
          JOIN   analyses a ON a.id = fe.analysis_id
          WHERE  fe.etapa = 'maduro' OR fe.cambia_a = 'maduro'
          GROUP BY fe.dias_para_cosecha
          ORDER BY fe.dias_para_cosecha ASC`;
    return rows.map((r) => ({
      daysToHarvest: Number(r.daysToHarvest),
      estimatedWeightGrams: Number(r.estimatedWeightGrams),
    }));
  }

  async getHealthMetrics(productorId?: string) {
    const result = await this.prisma.analysis.aggregate({
      where: productorId ? { productorId } : undefined,
      _avg: { porcentajeMermaGeneral: true },
      _sum: {
        elementosEnfermos: true,
        elementosSanos: true,
        totalElementosDetectados: true,
      },
    });
    return {
      avgLossPercent: result._avg.porcentajeMermaGeneral ?? 0,
      totalSickCount: result._sum.elementosEnfermos ?? 0,
      totalHealthyCount: result._sum.elementosSanos ?? 0,
      totalDetected: result._sum.totalElementosDetectados ?? 0,
    };
  }

  async getPhenologyDistribution(productorId?: string) {
    type Row = { stage: string; count: number };
    const rows: Row[] = productorId
      ? await this.prisma.$queryRaw`
          SELECT fe.etapa AS stage, COALESCE(SUM(fe.cantidad), 0) AS count
          FROM   fenologia_etapas fe
          JOIN   analyses a ON a.id = fe.analysis_id
          WHERE  a.productor_id = ${productorId}::uuid
          GROUP BY fe.etapa
          ORDER BY count DESC`
      : await this.prisma.$queryRaw`
          SELECT fe.etapa AS stage, COALESCE(SUM(fe.cantidad), 0) AS count
          FROM   fenologia_etapas fe
          GROUP BY fe.etapa
          ORDER BY count DESC`;
    return rows.map((r) => ({ stage: r.stage, count: Number(r.count) }));
  }
}
```

- [ ] **Step 3: Replace `fruit-backend/src/admin/admin.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminDashboardService],
})
export class AdminModule {}
```

- [ ] **Step 4: Delete Mongoose schemas**

```bash
rm fruit-backend/src/admin/schemas/analysis.schema.ts
```

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/admin/
git commit -m "feat(fruit-backend/admin): replace Mongoose aggregations with Prisma groupBy and \$queryRaw"
```

---

## Task 10: Verify `fruit-backend` Compiles

- [ ] **Step 1: Run TypeScript build**

```bash
cd fruit-backend
pnpm run build
```

Expected: TypeScript compiles to `dist/` with no errors.

Common errors to fix if they appear:
- `Module '@rubus/database' not found` → check that `pnpm install` ran from root and `packages/database` was built (`pnpm run build` in `packages/database`)
- `Property 'mongoUri' does not exist on type 'typeof envs'` → a missed `envs.mongoUri` reference somewhere; grep and remove it
- `Cannot find module './analyses.schema'` → a missed import of the deleted schema; trace it and remove
- Any type error from Prisma types → verify the schema fields match the usage

- [ ] **Step 2: Return to monorepo root**

```bash
cd ..
```

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add fruit-backend/
git commit -m "fix(fruit-backend): resolve TypeScript compilation errors after Prisma migration"
```

---

## Task 11: Migrate `fruit-ms`

**Files:**
- Modify: `fruit-ms/package.json`
- Modify: `fruit-ms/src/config/envs.ts`
- Modify: `fruit-ms/src/database/database.module.ts`
- Modify: `fruit-ms/src/fruits/fruits.module.ts`
- Create: `fruit-ms/src/fruits/infrastructure/analysis.prisma.repository.ts`
- Delete: `fruit-ms/src/fruits/schemas/analysis.schema.ts`
- Delete: `fruit-ms/src/fruits/infrastructure/analysis.mongoose.repository.ts`

- [ ] **Step 1: Update `fruit-ms/package.json`**

In the `dependencies` object:
1. Add: `"@rubus/database": "workspace:*"`
2. Remove: `"@nestjs/mongoose": "^11.0.4"`
3. Remove: `"mongoose": "^9.2.4"`

Run from monorepo root:

```bash
pnpm install
```

- [ ] **Step 2: Update `fruit-ms/.env`**

Remove the `MONGO_URI=...` line. Add:

```
DATABASE_URL="postgresql://rubus:rubus_dev@localhost:5432/rubusai"
```

- [ ] **Step 3: Replace `fruit-ms/src/config/envs.ts`**

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  RABBITMQ_URL:   string;
  RABBITMQ_QUEUE: string;
  INFERENCE_URL:  string;
}

const envSchema = joi
  .object({
    RABBITMQ_URL:   joi.string().required(),
    RABBITMQ_QUEUE: joi.string().required(),
    INFERENCE_URL:  joi.string().uri().required(),
  })
  .unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  rabbitmqUrl:   envVars.RABBITMQ_URL,
  rabbitmqQueue: envVars.RABBITMQ_QUEUE,
  inferenceUrl:  envVars.INFERENCE_URL,
};
```

- [ ] **Step 4: Replace `fruit-ms/src/database/database.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule as PrismaDatabaseModule } from '@rubus/database';

@Module({
  imports: [PrismaDatabaseModule],
  exports: [PrismaDatabaseModule],
})
export class DatabaseModule {}
```

- [ ] **Step 5: Create `fruit-ms/src/fruits/infrastructure/analysis.prisma.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { ANALYSIS_REPOSITORY } from '../ports';
import type { IAnalysisRepository, FindAllFilter, PaginatedResult } from '../ports';
import type { AnalysisDomain, EtapaFenologica } from '../domain/analysis.entity';

@Injectable()
export class PrismaAnalysisRepository implements IAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(analysis: AnalysisDomain): Promise<string> {
    if (!analysis.campo_id || !analysis.productor_id) {
      throw new Error('campo_id and productor_id are required');
    }

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.analysis.create({
        data: {
          imageId:                  analysis.image_id,
          storageKey:               analysis.storage_key,
          requesterUserId:          analysis.requester.userId,
          requesterEmail:           analysis.requester.email,
          variedad:                 analysis.variedad ?? null,
          fechaAnalisis:            analysis.fecha_analisis,
          totalElementosDetectados: analysis.metricas_salud.total_elementos_detectados,
          elementosSanos:           analysis.metricas_salud.elementos_sanos,
          elementosEnfermos:        analysis.metricas_salud.elementos_enfermos,
          porcentajeMermaGeneral:   analysis.metricas_salud.porcentaje_merma_general,
          pesoSanoGramos:           analysis.proyeccion_financiera.peso_sano_gramos,
          campoId:                  analysis.campo_id,
          productorId:              analysis.productor_id,
          ubicacionLat:             analysis.ubicacion_gps?.coordinates[1] ?? null,
          ubicacionLng:             analysis.ubicacion_gps?.coordinates[0] ?? null,
          offlineSyncId:            analysis.offline_sync_id ?? null,
        },
      });

      if (analysis.cronograma_fenologico.length > 0) {
        await tx.fenologiaEtapa.createMany({
          data: analysis.cronograma_fenologico.map((e: EtapaFenologica) => ({
            analysisId:     created.id,
            etapa:          e.etapa,
            cantidad:       e.cantidad,
            cambiaA:        e.prediccion.cambio_a,
            enDias:         e.prediccion.en_dias,
            diasParaCosecha: e.prediccion.dias_para_cosecha,
          })),
        });
      }

      return created;
    });

    return record.id;
  }

  async findAll(
    page: number,
    limit: number,
    filter: FindAllFilter,
  ): Promise<PaginatedResult<AnalysisDomain>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (filter.imageId)    where.imageId         = filter.imageId;
    if (filter.userId)     where.requesterUserId  = filter.userId;
    if (filter.productorId) where.productorId     = filter.productorId;
    if (filter.campoIds?.length) where.campoId    = { in: filter.campoIds };

    if (filter.startDate || filter.endDate) {
      where.fechaAnalisis = {
        ...(filter.startDate ? { gte: filter.startDate } : {}),
        ...(filter.endDate   ? { lte: filter.endDate }   : {}),
      };
    }

    const [docs, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { fenologiaEtapas: true },
      }),
      this.prisma.analysis.count({ where }),
    ]);

    return { data: docs.map((d) => this.toDomain(d)), total, page, limit };
  }

  async findById(id: string): Promise<AnalysisDomain | null> {
    const doc = await this.prisma.analysis.findUnique({
      where: { id },
      include: { fenologiaEtapas: true },
    });
    if (!doc) return null;
    return this.toDomain(doc);
  }

  private toDomain(doc: any): AnalysisDomain {
    return {
      id:            doc.id,
      image_id:      doc.imageId,
      storage_key:   doc.storageKey,
      requester:     { userId: doc.requesterUserId, email: doc.requesterEmail },
      variedad:      doc.variedad ?? null,
      fecha_analisis: doc.fechaAnalisis,
      metricas_salud: {
        total_elementos_detectados: doc.totalElementosDetectados,
        elementos_sanos:            doc.elementosSanos,
        elementos_enfermos:         doc.elementosEnfermos,
        porcentaje_merma_general:   doc.porcentajeMermaGeneral,
      },
      proyeccion_financiera: { peso_sano_gramos: doc.pesoSanoGramos },
      cronograma_fenologico: (doc.fenologiaEtapas ?? []).map((e: any) => ({
        etapa:    e.etapa,
        cantidad: e.cantidad,
        prediccion: {
          cambio_a:         e.cambiaA,
          en_dias:          e.enDias,
          dias_para_cosecha: e.diasParaCosecha,
        },
      })),
      campo_id:       doc.campoId ?? null,
      productor_id:   doc.productorId ?? null,
      ubicacion_gps:
        doc.ubicacionLat != null && doc.ubicacionLng != null
          ? { type: 'Point', coordinates: [doc.ubicacionLng, doc.ubicacionLat] }
          : null,
      offline_sync_id: doc.offlineSyncId ?? null,
      validacion_experto: doc.validacionCorregidoPorId
        ? {
            fue_corregido:        doc.validacionFueCorregido,
            corregido_por:        doc.validacionCorregidoPorId,
            diagnostico_original: doc.validacionDiagnosticoOriginal ?? null,
          }
        : null,
    };
  }
}
```

- [ ] **Step 6: Replace `fruit-ms/src/fruits/fruits.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FruitsController } from './fruits.controller';
import { FruitsService } from './fruits.service';
import { ANALYSIS_REPOSITORY } from './ports';
import { I_INFERENCE_PORT } from './ports/inference.port';
import { PrismaAnalysisRepository } from './infrastructure/analysis.prisma.repository';
import { InferenceHttpAdapter } from './infrastructure/inference-http.adapter';

@Module({
  imports: [HttpModule],
  controllers: [FruitsController],
  providers: [
    FruitsService,
    { provide: ANALYSIS_REPOSITORY, useClass: PrismaAnalysisRepository },
    { provide: I_INFERENCE_PORT, useClass: InferenceHttpAdapter },
  ],
})
export class FruitsModule {}
```

- [ ] **Step 7: Delete Mongoose files**

```bash
rm fruit-ms/src/fruits/schemas/analysis.schema.ts
rm fruit-ms/src/fruits/infrastructure/analysis.mongoose.repository.ts
```

- [ ] **Step 8: Verify fruit-ms compiles**

```bash
cd fruit-ms
pnpm run build
```

Expected: no errors. Fix any missed imports the same way as Task 10.

```bash
cd ..
```

- [ ] **Step 9: Commit**

```bash
git add fruit-ms/
git commit -m "feat(fruit-ms): replace Mongoose with PrismaAnalysisRepository using @rubus/database"
```

---

## Task 12: Update Dockerfiles for Monorepo Build

Both Dockerfiles currently `COPY . .` from within their service directory. They need to be updated to build from the monorepo root so they can access `packages/database`.

**Files:**
- Modify: `fruit-backend/Dockerfile`
- Modify: `fruit-ms/Dockerfile`

- [ ] **Step 1: Replace `fruit-backend/Dockerfile`**

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests (cacheable layer)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/package.json
COPY fruit-backend/package.json ./fruit-backend/package.json

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/database ./packages/database
COPY fruit-backend ./fruit-backend

# Generate Prisma client + build shared package
RUN pnpm --filter @rubus/database run build

# Build fruit-backend TypeScript
RUN pnpm --filter ./fruit-backend run build

# ── Production runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/package.json
COPY fruit-backend/package.json ./fruit-backend/package.json

RUN pnpm install --prod --frozen-lockfile

# Copy compiled assets
COPY --from=builder /repo/packages/database/dist  ./packages/database/dist
COPY --from=builder /repo/packages/database/src/generated ./packages/database/src/generated
COPY --from=builder /repo/fruit-backend/dist ./fruit-backend/dist

WORKDIR /repo/fruit-backend

EXPOSE 3000

USER node

CMD ["node", "dist/main"]
```

- [ ] **Step 2: Replace `fruit-ms/Dockerfile`**

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /repo

RUN npm install -g pnpm

# Copy workspace manifests (cacheable layer)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/package.json
COPY fruit-ms/package.json ./fruit-ms/package.json

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/database ./packages/database
COPY fruit-ms ./fruit-ms

# Generate Prisma client + build shared package
RUN pnpm --filter @rubus/database run build

# Build fruit-ms TypeScript
RUN pnpm --filter ./fruit-ms run build

# ── Production runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /repo

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/package.json
COPY fruit-ms/package.json ./fruit-ms/package.json

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /repo/packages/database/dist  ./packages/database/dist
COPY --from=builder /repo/packages/database/src/generated ./packages/database/src/generated
COPY --from=builder /repo/fruit-ms/dist ./fruit-ms/dist

WORKDIR /repo/fruit-ms

CMD ["node", "dist/main"]
```

> **Note on `pnpm-lock.yaml`:** After updating both `package.json` files, run `pnpm install` from the root to regenerate `pnpm-lock.yaml`. The Dockerfiles use `--frozen-lockfile`, so the lockfile must be current. If Docker build fails with a frozen lockfile error, run `pnpm install` and commit the updated `pnpm-lock.yaml`.

- [ ] **Step 3: Commit**

```bash
git add fruit-backend/Dockerfile fruit-ms/Dockerfile
git commit -m "build: update Dockerfiles for monorepo workspace build"
```

---

## Task 13: Full Stack End-to-End Verification

- [ ] **Step 1: Stop any running containers**

```bash
docker compose down
```

- [ ] **Step 2: Build and start the full stack**

```bash
docker compose up --build
```

Watch the logs. Expected sequence:
1. `postgres` starts and becomes healthy (~10s)
2. `rabbitmq` starts and becomes healthy (~20s)
3. `fruit-inference` starts and loads the YOLO model (~30s)
4. `fruit-backend` starts — look for: `[NestApplication] Nest application successfully started`
5. `fruit-ms` starts — look for: `[NestApplication] Nest application successfully started`

Common errors and fixes:
- `DATABASE_URL not set` → The `docker-compose.yml` `environment:` block overrides it — verify the override was added in Task 1
- `P1001: Can't reach database server` → PostgreSQL is not healthy yet; add a retry loop or increase `start_period`
- `relation "users" does not exist` → The migration was not applied inside Docker. Add a `prisma migrate deploy` step to the startup command (see below)

- [ ] **Step 3: If migration isn't applied in Docker, add it to startup**

Prisma migrations must run before the app starts. Update `fruit-backend/Dockerfile` CMD:

```dockerfile
CMD ["sh", "-c", "cd /repo/packages/database && pnpm exec prisma migrate deploy && cd /repo/fruit-backend && node dist/main"]
```

Or add a `poststart` script. The cleanest way: run `prisma migrate deploy` as the Docker CMD before starting Node.

Alternatively, run migrations manually once PostgreSQL is up:

```bash
docker compose up postgres -d
cd packages/database && pnpm exec prisma migrate deploy
```

Then restart the services:

```bash
docker compose up fruit-backend fruit-ms --build
```

- [ ] **Step 4: Smoke test — register a user**

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","role":"PRODUCTOR"}'
```

Expected: `201 Created` with a user object containing a UUID `id` field.

- [ ] **Step 5: Smoke test — login**

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

Expected: `200 OK` with `{ "access_token": "..." }`. Save the token.

- [ ] **Step 6: Smoke test — list analyses**

```bash
curl -X GET "http://localhost:3001/analyses?estado=all" \
  -H "Authorization: Bearer <token-from-step-5>"
```

Expected: `200 OK` with `{ "data": [], "total": 0, "page": 1, "limit": 20 }`.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: complete MongoDB → PostgreSQL migration — all services running on Prisma"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `packages/database` with schema.prisma + PrismaService | Task 2 |
| All 6 tables: users, campos, user_campos, solicitudes_muestreo, analyses, fenologia_etapas | Task 2, Step 4 |
| `offline_sync_id` UNIQUE nullable | Task 2 Step 4 — `@unique` nullable ✓ |
| `cronograma_fenologico[]` → `fenologia_etapas` table | Task 2 Step 4, Task 11 Step 5 (save with createMany) ✓ |
| `campos_asignados[]` → `user_campos` join table | Task 5 (findById), Task 9 (updateCampos) ✓ |
| `ubicacion_gps` → two Float columns | Task 2 Step 4 (ubicacionLat, ubicacionLng), Task 11 Step 5 (toDomain) ✓ |
| Docker: replace mongo with postgres (postgis image) | Task 1 ✓ |
| Aggregations converted to Prisma groupBy / $queryRaw | Task 9 ✓ |
| `fruit-backend` removes @nestjs/mongoose | Task 4 ✓ |
| `fruit-ms` removes @nestjs/mongoose | Task 11 ✓ |
| `prisma migrate dev` from packages/database only | Task 3 ✓ |

**Out of scope (per spec):**
- fruit-inference — no changes needed
- zarza_ai — no changes needed (API consumers will need camelCase field name updates as follow-up)
- PostGIS / heatmaps — future work
- Supabase — future work (just change `DATABASE_URL`)
