# Diseño: Migración MongoDB → PostgreSQL (RubusAI)

**Fecha:** 2026-05-07
**Autor:** Santiago Nuñez
**Estado:** Aprobado

---

## Contexto

RubusAI (anteriormente Zarza AI) es una plataforma de agricultura de precisión con arquitectura de microservicios. Actualmente usa MongoDB con Mongoose en dos servicios NestJS (`fruit-backend` y `fruit-ms`) que comparten la misma base de datos.

**Motivación de la migración:**
- Integridad referencial real (foreign keys, transacciones ACID)
- Ecosistema moderno: Prisma como ORM con schema-as-code, migraciones tipadas y DX superior
- Camino hacia Supabase en producción (Supabase es PostgreSQL puro — el cambio futuro es solo `DATABASE_URL`)

**Estrategia:** Big bang — el sistema está en desarrollo activo sin datos de producción que preservar.

---

## Arquitectura General

### Estructura del monorepo

```
Proyecto Dalet/
├── packages/
│   └── database/                  ← NUEVO
│       ├── package.json           (name: "@rubus/database")
│       ├── prisma/
│       │   ├── schema.prisma      ← única fuente de verdad del schema
│       │   └── migrations/        ← historial de migraciones
│       └── src/
│           ├── prisma.service.ts  ← PrismaService (lifecycle NestJS)
│           └── index.ts           ← re-exporta PrismaService + tipos
├── fruit-backend/                 ← importa @rubus/database
├── fruit-ms/                      ← importa @rubus/database
├── fruit-inference/               ← sin cambios (Python)
├── zarza_ai/                      ← sin cambios (Flutter)
├── pnpm-workspace.yaml            ← actualizado con packages/*
└── docker-compose.yml             ← reemplaza mongo por postgres
```

### Flujo de migraciones

Solo `packages/database` ejecuta `prisma migrate dev`. Ambos servicios NestJS importan `PrismaService` de `@rubus/database` y lo registran como provider global en sus módulos raíz.

---

## Schema de Base de Datos (PostgreSQL)

### Tabla `users`

| Columna | Tipo | Restricciones |
|---|---|---|
| id | UUID | PK, default gen_random_uuid() |
| email | VARCHAR | UNIQUE NOT NULL |
| password_hash | VARCHAR | NOT NULL |
| role | ENUM | ADMIN, PRODUCTOR, AGRONOMO, MONITOR — NOT NULL |
| fcm_token | VARCHAR | nullable |
| created_at | TIMESTAMP | NOT NULL default now() |
| updated_at | TIMESTAMP | NOT NULL |

### Tabla `user_campos` (join table)

Reemplaza el array `campos_asignados` en el documento de usuario.

| Columna | Tipo | Restricciones |
|---|---|---|
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| campo_id | UUID | FK → campos(id) ON DELETE CASCADE |

PK compuesta: `(user_id, campo_id)`

### Tabla `campos`

`poligono_gps` se almacena como JSONB (array de pares `[lng, lat]`). No se ejecutan queries geoespaciales sobre él actualmente.

| Columna | Tipo | Restricciones |
|---|---|---|
| id | UUID | PK |
| codigo_campo | VARCHAR | NOT NULL |
| nombre | VARCHAR | NOT NULL |
| productor_id | UUID | FK → users(id) NOT NULL |
| poligono_gps | JSONB | nullable |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### Tabla `solicitudes_muestreo`

| Columna | Tipo | Restricciones |
|---|---|---|
| id | UUID | PK |
| creado_por_id | UUID | FK → users(id) NOT NULL |
| asignado_a_id | UUID | FK → users(id) NOT NULL |
| campo_id | UUID | FK → campos(id) NOT NULL |
| mensaje | TEXT | NOT NULL |
| estado | ENUM | PENDIENTE, EN_PROGRESO, COMPLETADO, CANCELADO |
| fecha_limite | TIMESTAMP | nullable |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### Tabla `analyses`

Los objetos anidados de MongoDB (`metricas_salud`, `proyeccion_financiera`, `validacion_experto`) se aplanan a columnas directas. El array `cronograma_fenologico` se extrae a `fenologia_etapas`.

`ubicacion_gps` se almacena como dos columnas Float. PostGIS se añade cuando se implementen los heatmaps.

| Columna | Tipo | Restricciones |
|---|---|---|
| id | UUID | PK |
| image_id | VARCHAR | UNIQUE NOT NULL |
| storage_key | VARCHAR | NOT NULL |
| requester_user_id | UUID | FK → users(id) NOT NULL |
| requester_email | VARCHAR | NOT NULL (snapshot histórico) |
| variedad | VARCHAR | nullable |
| fecha_analisis | TIMESTAMP | NOT NULL |
| total_elementos_detectados | INT | NOT NULL |
| elementos_sanos | INT | NOT NULL |
| elementos_enfermos | INT | NOT NULL |
| porcentaje_merma_general | FLOAT | NOT NULL |
| peso_sano_gramos | FLOAT | NOT NULL |
| ubicacion_lat | FLOAT | nullable |
| ubicacion_lng | FLOAT | nullable |
| campo_id | UUID | FK → campos(id) NOT NULL |
| productor_id | UUID | FK → users(id) NOT NULL |
| offline_sync_id | VARCHAR | UNIQUE nullable |
| validacion_estado | ENUM | pendiente, validado, rechazado — default 'pendiente' |
| validacion_fue_corregido | BOOLEAN | default false |
| validacion_corregido_por_id | UUID | FK → users(id) nullable |
| validacion_diagnostico_original | TEXT | nullable |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### Tabla `fenologia_etapas`

Reemplaza el array `cronograma_fenologico` dentro de cada documento de análisis.

| Columna | Tipo | Restricciones |
|---|---|---|
| id | UUID | PK |
| analysis_id | UUID | FK → analyses(id) ON DELETE CASCADE |
| etapa | VARCHAR | NOT NULL |
| cantidad | INT | NOT NULL |
| cambia_a | VARCHAR | NOT NULL |
| en_dias | INT | NOT NULL |
| dias_para_cosecha | INT | NOT NULL |

### Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `cronograma_fenologico[]` → tabla `fenologia_etapas` | Convierte `$unwind + $group` en JOINs SQL; habilita queries directas sobre etapas |
| `ubicacion_gps` → dos columnas Float | El índice 2dsphere no está activo; PostGIS se añade cuando se implemente el heatmap |
| `campos_asignados[]` → tabla `user_campos` | Foreign keys reales + integridad referencial |
| `requester_email` como snapshot | Preserva historial aunque el usuario cambie su email; no se sincroniza ante cambios de email — comportamiento intencional |
| `offline_sync_id` UNIQUE nullable | PostgreSQL indexa solo valores no-null en UNIQUE nullable — equivalente al sparse index de Mongo |

---

## Cambios en la Capa de Servicios

### `packages/database` (nuevo)

- `prisma.service.ts`: extiende `PrismaClient`, implementa `OnModuleInit` y `OnModuleDestroy`
- `index.ts`: re-exporta `PrismaService` y todos los tipos generados por Prisma
- Migraciones: `prisma migrate dev` solo se ejecuta desde este package

### `fruit-backend`

**Eliminar:**
- Dependencias: `@nestjs/mongoose`, `mongoose`
- Todos los archivos `*.schema.ts` de Mongoose
- `MongooseModule.forFeature(...)` y `MongooseModule.forRootAsync(...)` en cada módulo

**Reemplazar:**
- `mongoose-user.repository.ts` → `prisma-user.repository.ts`
- `campos.service.ts` → usa `PrismaService` directamente
- `solicitudes.service.ts` → usa `PrismaService` directamente
- `admin-dashboard.service.ts` → aggregations convertidas a `groupBy` de Prisma o `$queryRaw` para los casos más complejos

**Agregar:**
- `DatabaseModule` (importado de `@rubus/database`) en `AppModule`

### `fruit-ms`

**Eliminar:**
- Dependencias: `@nestjs/mongoose`, `mongoose`
- `src/fruits/schemas/analysis.schema.ts`

**Reemplazar:**
- `analysis.mongoose.repository.ts` → `analysis.prisma.repository.ts`
- La creación de un análisis pasa a ser una **transacción Prisma** que inserta en `analyses` y en `fenologia_etapas` atómicamente

### Conversión de aggregations del dashboard

| Pipeline MongoDB | Equivalente SQL / Prisma |
|---|---|
| `$unwind: cronograma_fenologico` + `$group by dias_para_cosecha` | JOIN `fenologia_etapas` + `groupBy diasParaCosecha` |
| `$group: null` + `$avg porcentaje_merma` | `aggregate({ _avg: { porcentajeMermaGeneral: true } })` |
| `$unwind: cronograma_fenologico` + `$group by etapa` | JOIN `fenologia_etapas` + `groupBy etapa` |
| `$group by role` (users) | `groupBy role` de Prisma |
| `$group by requester.userId` (analyses) | `groupBy requesterUserId` de Prisma |

---

## Infraestructura Docker

### `docker-compose.yml`

```yaml
# Reemplaza el servicio mongo por:
postgres:
  image: postgis/postgis:16-3.4-alpine
  environment:
    POSTGRES_DB: rubusai
    POSTGRES_USER: rubus
    POSTGRES_PASSWORD: rubus_dev
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U rubus -d rubusai"]
    interval: 10s
    timeout: 5s
    retries: 5
```

Se usa `postgis/postgis` en lugar de `postgres` puro para tener PostGIS disponible cuando se implementen los heatmaps sin necesidad de cambiar la imagen.

### Variables de entorno

En `fruit-backend/.env` y `fruit-ms/.env`, reemplazar `MONGO_URI` por:

```
DATABASE_URL="postgresql://rubus:rubus_dev@localhost:5432/rubusai"
```

Para producción futura en Supabase, solo cambia esta variable.

---

## Orden de Implementación (Big Bang)

1. Configurar `pnpm-workspace.yaml` con `packages/*`
2. Crear `packages/database` con `package.json` y `PrismaService`
3. Escribir `schema.prisma` completo con todos los modelos
4. Ejecutar primera migración: `prisma migrate dev --name init`
5. Actualizar `docker-compose.yml` (reemplazar mongo por postgres)
6. Migrar `fruit-backend`: eliminar Mongoose, implementar repositorios Prisma
7. Migrar `fruit-ms`: eliminar Mongoose, implementar repositorio Prisma con transacción
8. Actualizar variables de entorno en ambos servicios
9. Probar con `docker compose up --build`

---

## Fuera de Scope

- Migración de datos existentes (no hay datos de producción)
- Implementación de PostGIS / heatmaps (trabajo futuro)
- Cambios en `fruit-inference` (Python, no accede a DB directamente)
- Cambios en `zarza_ai` (Flutter, consume API REST)
- Migración a Supabase (trabajo futuro — solo requiere cambiar `DATABASE_URL`)
