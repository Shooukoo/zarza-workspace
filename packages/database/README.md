# @rubus/database

Paquete de workspace (pnpm) que centraliza el acceso a datos de Zarza AI: schema de Prisma, migraciones y un `PrismaService` reutilizado por `fruit-backend` y `fruit-ms`. Ningún otro servicio declara su propio cliente de base de datos.

Ver también el [README raíz](../../README.md) para el modelo de datos completo y la arquitectura del sistema.

## Stack

Prisma 6 · PostgreSQL (imagen `postgis/postgis:16-3.4-alpine` en Docker Compose, aunque el schema actual solo usa columnas `Float` para latitud/longitud, sin tipos geométricos de PostGIS).

## Contenido

```
packages/database/
├── prisma/
│   ├── schema.prisma      # Modelos: User, Campo, UserCampo, SolicitudMuestreo,
│   │                       #   Analysis, FenologiaEtapa, RefreshToken, Notification
│   └── migrations/         # Historial de migraciones (init, add_user_name, add_refresh_tokens, add_notifications)
└── src/
    ├── database.module.ts  # DatabaseModule (Nest) — expone PrismaService
    ├── prisma.service.ts    # PrismaService (extiende PrismaClient)
    ├── pagination.ts        # Helpers de paginación compartidos
    └── index.ts              # Barrel: PrismaService, DatabaseModule, pagination, cliente Prisma generado
```

El cliente de Prisma se genera en `src/generated/client` (`generator client { output = "../generated/client" }`) y se re-exporta desde `index.ts`, de modo que los consumidores importan todo desde `@rubus/database` sin depender directamente de `@prisma/client`.

## Uso desde otros servicios

```ts
import { DatabaseModule, PrismaService } from '@rubus/database';
```

`fruit-backend` y `fruit-ms` declaran `@rubus/database` como dependencia de workspace (`workspace:*`) e importan `DatabaseModule` en su módulo raíz de persistencia.

## Comandos

```bash
pnpm install
pnpm run generate        # prisma generate — regenera el cliente en src/generated/client
pnpm run migrate:dev      # prisma migrate dev — crea/aplica migraciones en desarrollo
pnpm run migrate:deploy   # prisma migrate deploy — aplica migraciones pendientes (producción/CI)
pnpm run studio           # prisma studio — explorador visual de datos
pnpm run build            # prisma generate && tsc — build usado por los Dockerfile de fruit-backend/fruit-ms
```

## Variable de entorno

```env
DATABASE_URL=postgresql://rubus:rubus_dev@localhost:5433/rubusai
```

En Docker Compose, `fruit-backend` y `fruit-ms` reciben `DATABASE_URL` apuntando al servicio `postgres` (`postgresql://rubus:rubus_dev@postgres:5432/rubusai`).

## Al modificar el schema

1. Editar `prisma/schema.prisma`.
2. Ejecutar `pnpm run migrate:dev --name <descripcion>` para generar la migración y regenerar el cliente.
3. Reconstruir las imágenes Docker de `fruit-backend`/`fruit-ms` (sus Dockerfiles compilan `@rubus/database` como paso previo, por lo que un cliente Prisma desactualizado en `dist`/`generated` no se recoge automáticamente sin rebuild).
