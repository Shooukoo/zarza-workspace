# Mapas de Calor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una página "Mapas de Calor" en `zarza-web` que visualiza geográficamente los análisis de zarzamora (vista general por campo + drill-in a puntos individuales), con capa satelital, clustering, impresión, y un editor de polígono de campo en `CamposPage` que alimenta la vista general.

**Architecture:** Nuevo módulo `mapas-calor` en `fruit-backend` (dos endpoints de solo lectura, sin caché, scoping por rol idéntico al de `campos`) + extensión de `campos` con un endpoint de actualización de polígono (hoy `CamposController` no tiene ningún endpoint de escritura salvo `create`/`delete`). En el frontend, Leaflet + `react-leaflet` (no Mapbox GL JS) con capas OSM/Mapbox intercambiables, `react-leaflet-cluster` para agrupar puntos cercanos, y `leaflet-draw` para el editor de polígono.

**Tech Stack:** NestJS 11 + Prisma (`@rubus/database`) en el backend; React 18 + `react-leaflet` v4 + `leaflet-draw` + `react-leaflet-cluster` + antd + TanStack Query en el frontend.

**Spec:** `docs/superpowers/specs/2026-08-16-mapas-calor-design.md`

---

## Prerrequisitos

- `docker compose up postgres` corriendo para poder ejecutar la migración de Prisma.
- Tras cada cambio en `packages/database/prisma/schema.prisma`, correr `pnpm run generate` en `packages/database` y reconstruir lo que uses en dev (`pnpm --filter fruit-backend run start:dev` recoge el cliente regenerado sin rebuild de Docker en dev).
- `zarza-web` no tiene test runner configurado (no Vitest/RTL) — las tareas de frontend se verifican manualmente en el navegador, no con tests automatizados. Backend sí usa Jest (`pnpm exec jest <archivo>`), y ahí se sigue TDD.

## File Map

**Backend — nuevo:**
- `fruit-backend/src/mapas-calor/mapas-calor.service.ts` — agregación por campo, lista de análisis geolocalizados por campo, chequeo de acceso.
- `fruit-backend/src/mapas-calor/mapas-calor.service.spec.ts`
- `fruit-backend/src/mapas-calor/mapas-calor.controller.ts` — endpoints HTTP, resuelve `UserScope` desde el JWT.
- `fruit-backend/src/mapas-calor/mapas-calor.module.ts`
- `fruit-backend/src/mapas-calor/dto/heatmap-query.dto.ts`
- `fruit-backend/src/campos/dto/update-poligono.dto.ts`
- `fruit-backend/src/campos/campos.service.spec.ts` (nuevo)

**Backend — modificar:**
- `packages/database/prisma/schema.prisma` — índice nuevo en `Analysis`.
- `fruit-backend/src/campos/campos.service.ts` — método `updatePoligono`.
- `fruit-backend/src/campos/campos.controller.ts` — endpoint `PATCH /campos/:id/poligono`.
- `fruit-backend/src/app.module.ts` — registra `MapasCalorModule`.

**Frontend — nuevo:**
- `zarza-web/.env.example`
- `zarza-web/src/mapas-calor/types.ts`
- `zarza-web/src/mapas-calor/metricColor.ts` — escala de color relativa (verde→amarillo→rojo).
- `zarza-web/src/mapas-calor/MapLayerToggle.tsx` — toggle calles/satélite + resolución de URL de tiles, compartido con el editor de polígono.
- `zarza-web/src/mapas-calor/hooks/useMapasCalor.ts`
- `zarza-web/src/mapas-calor/CamposOverviewMap.tsx` — vista general (polígono/círculo por campo).
- `zarza-web/src/mapas-calor/AnalisisPopup.tsx` — contenido del popup de un análisis.
- `zarza-web/src/mapas-calor/CampoDetailMap.tsx` — vista de campo (clustering + popups).
- `zarza-web/src/mapas-calor/MapasCalorPage.tsx` — orquesta filtros, drill-in, impresión.
- `zarza-web/src/campos/EditCampoPolygonModal.tsx` — editor de polígono con `leaflet-draw`.

**Frontend — modificar:**
- `zarza-web/package.json` — deps de Leaflet.
- `zarza-web/src/main.tsx` — imports de CSS de Leaflet/leaflet-draw/markercluster.
- `zarza-web/src/campos/hooks/useCampos.ts` — `poligonoGps` en `Campo` + `useUpdateCampoPoligono`.
- `zarza-web/src/campos/CamposPage.tsx` — columna "Editar límites".
- `zarza-web/src/shared/AppShell.tsx` — nav item + clase para ocultar en impresión.
- `zarza-web/src/App.tsx` — ruta `/mapas-calor`.
- `zarza-web/src/analisis/AnalisisPage.tsx` — soporte de `?id=` para abrir el modal de detalle.

---

## Task 1: Índice de Prisma para queries por rango de fecha

**Files:**
- Modify: `packages/database/prisma/schema.prisma:119-159` (modelo `Analysis`)

- [ ] **Step 1: Agregar el índice al modelo**

En `packages/database/prisma/schema.prisma`, dentro del modelo `Analysis`, agregar la línea `@@index` antes de `@@map("analyses")`:

```prisma
  fenologiaEtapas          FenologiaEtapa[]
  detections               Detection[]
  modelFeedback            ModelFeedback[]

  @@index([campoId, fechaAnalisis])
  @@map("analyses")
}
```

- [ ] **Step 2: Generar la migración**

Run: `cd packages/database && pnpm run migrate:dev --name add_analysis_campo_fecha_index`
Expected: la migración se crea y aplica sin errores contra la base de datos local (requiere `docker compose up postgres` corriendo).

- [ ] **Step 3: Regenerar el cliente Prisma**

Run: `cd packages/database && pnpm run generate`
Expected: termina sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations
git commit -m "perf(database): agregar índice compuesto campoId+fechaAnalisis a Analysis"
```

---

## Task 2: Endpoint de edición de polígono de campo (backend)

**Files:**
- Create: `fruit-backend/src/campos/dto/update-poligono.dto.ts`
- Create: `fruit-backend/src/campos/campos.service.spec.ts`
- Modify: `fruit-backend/src/campos/campos.service.ts`
- Modify: `fruit-backend/src/campos/campos.controller.ts`

- [ ] **Step 1: Crear el DTO**

`fruit-backend/src/campos/dto/update-poligono.dto.ts`:

```ts
import { IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePoligonoDto {
  @ApiProperty({
    example: [
      [-103.3472, 19.7023],
      [-103.3465, 19.7023],
      [-103.3465, 19.7015],
    ],
    description:
      'Matriz de coordenadas [longitud, latitud] que forman el polígono del campo. Mínimo 3 puntos.',
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'number' },
    },
  })
  @IsArray()
  @ArrayMinSize(3, { message: 'El polígono debe tener al menos 3 puntos' })
  poligono_gps: number[][];
}
```

- [ ] **Step 2: Escribir el test que falla**

`fruit-backend/src/campos/campos.service.spec.ts` (archivo nuevo, `CamposService` hoy no tiene spec):

```ts
import { CamposService } from './campos.service';
import { PrismaService } from '@rubus/database';
import { AppLogger } from '../common/logging/app.logger';
import { Role } from '../auth/domain/enums/role.enum';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('CamposService', () => {
  let prisma: {
    campo: { findUnique: jest.Mock; update: jest.Mock };
  };
  let logger: { info: jest.Mock };
  let service: CamposService;

  beforeEach(() => {
    prisma = {
      campo: { findUnique: jest.fn(), update: jest.fn() },
    };
    logger = { info: jest.fn() };
    service = new CamposService(
      prisma as unknown as PrismaService,
      logger as unknown as AppLogger,
    );
  });

  describe('updatePoligono()', () => {
    const poligono = [
      [-103.3472, 19.7023],
      [-103.3465, 19.7023],
      [-103.3465, 19.7015],
    ];

    it('lanza NotFoundException si el campo no existe', async () => {
      prisma.campo.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePoligono('campo-1', poligono, {
          sub: 'user-1',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si un PRODUCTOR no es dueño del campo', async () => {
      prisma.campo.findUnique.mockResolvedValue({
        id: 'campo-1',
        productorId: 'otro-productor',
      });

      await expect(
        service.updatePoligono('campo-1', poligono, {
          sub: 'user-1',
          role: Role.PRODUCTOR,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite a un PRODUCTOR dueño actualizar su campo', async () => {
      prisma.campo.findUnique.mockResolvedValue({
        id: 'campo-1',
        productorId: 'user-1',
      });
      prisma.campo.update.mockResolvedValue({
        id: 'campo-1',
        poligonoGps: poligono,
      });

      const result = await service.updatePoligono('campo-1', poligono, {
        sub: 'user-1',
        role: Role.PRODUCTOR,
      });

      expect(prisma.campo.update).toHaveBeenCalledWith({
        where: { id: 'campo-1' },
        data: { poligonoGps: poligono },
      });
      expect(result).toEqual({ id: 'campo-1', poligonoGps: poligono });
    });

    it('permite a un ADMIN actualizar cualquier campo', async () => {
      prisma.campo.findUnique.mockResolvedValue({
        id: 'campo-1',
        productorId: 'otro-productor',
      });
      prisma.campo.update.mockResolvedValue({
        id: 'campo-1',
        poligonoGps: poligono,
      });

      await service.updatePoligono('campo-1', poligono, {
        sub: 'admin-1',
        role: Role.ADMIN,
      });

      expect(prisma.campo.update).toHaveBeenCalled();
    });

    it('lanza BadRequestException con menos de 3 puntos', async () => {
      await expect(
        service.updatePoligono(
          'campo-1',
          [
            [0, 0],
            [1, 1],
          ],
          { sub: 'user-1', role: Role.PRODUCTOR },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.campo.findUnique).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException con coordenadas fuera de rango', async () => {
      await expect(
        service.updatePoligono(
          'campo-1',
          [
            [-200, 19],
            [-103, 19],
            [-103, 20],
          ],
          { sub: 'user-1', role: Role.PRODUCTOR },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.campo.findUnique).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd fruit-backend && pnpm exec jest campos.service.spec.ts`
Expected: FAIL — `service.updatePoligono is not a function`.

- [ ] **Step 4: Implementar `updatePoligono` en el servicio**

En `fruit-backend/src/campos/campos.service.ts`, actualizar imports y agregar el método:

```ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { CreateCampoDto } from './dto/create-campo.dto';
import { AppLogger } from '../common/logging/app.logger';
import { Role } from '../auth/domain/enums/role.enum';
```

Agregar al final de la clase `CamposService` (antes de la llave de cierre):

```ts
  async updatePoligono(
    id: string,
    poligonoGps: number[][],
    requester: { sub: string; role: Role },
  ) {
    assertValidPoligono(poligonoGps);

    const campo = await this.prisma.campo.findUnique({ where: { id } });
    if (!campo)
      throw new NotFoundException(`Campo con id "${id}" no encontrado`);

    if (requester.role === Role.PRODUCTOR && campo.productorId !== requester.sub) {
      throw new ForbiddenException('No sos el productor dueño de este campo');
    }

    const updated = await this.prisma.campo.update({
      where: { id },
      data: { poligonoGps },
    });

    this.logger.info('Polígono de campo actualizado', {
      campoId: id,
      points: poligonoGps.length,
    });

    return updated;
  }
```

Y, fuera de la clase, al final del archivo:

```ts
function assertValidPoligono(points: number[][]): void {
  if (!Array.isArray(points) || points.length < 3) {
    throw new BadRequestException('El polígono debe tener al menos 3 puntos');
  }
  for (const point of points) {
    if (!Array.isArray(point) || point.length !== 2) {
      throw new BadRequestException(
        'Cada punto del polígono debe ser [longitud, latitud]',
      );
    }
    const [lng, lat] = point;
    if (typeof lng !== 'number' || lng < -180 || lng > 180) {
      throw new BadRequestException(`Longitud fuera de rango: ${lng}`);
    }
    if (typeof lat !== 'number' || lat < -90 || lat > 90) {
      throw new BadRequestException(`Latitud fuera de rango: ${lat}`);
    }
  }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd fruit-backend && pnpm exec jest campos.service.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Agregar el endpoint al controller**

En `fruit-backend/src/campos/campos.controller.ts`, agregar el import del DTO junto a los existentes:

```ts
import { UpdatePoligonoDto } from './dto/update-poligono.dto';
```

Y agregar el nuevo endpoint, antes del método `delete`:

```ts
  @Patch(':id/poligono')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiOperation({
    summary: 'Actualizar el polígono de límites de un campo',
    description:
      'Reemplaza el polígono GPS del campo. Solo el administrador o el productor dueño del campo pueden hacerlo.',
  })
  @ApiParam({
    name: 'id',
    description: 'Campo UUID.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Polígono actualizado correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'El polígono tiene menos de 3 puntos o coordenadas inválidas.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no es dueño de este campo.',
  })
  @ApiResponse({
    status: 404,
    description: 'Campo no encontrado.',
  })
  updatePoligono(
    @Param('id') id: string,
    @Body() dto: UpdatePoligonoDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.camposService.updatePoligono(id, dto.poligono_gps, {
      sub: req.user.sub,
      role: req.user.role,
    });
  }
```

También actualizar el import de `@nestjs/common` en la parte superior del archivo para incluir `Patch`:

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Inject,
  NotFoundException,
} from '@nestjs/common';
```

- [ ] **Step 7: Verificar que el proyecto compila**

Run: `cd fruit-backend && pnpm exec tsc --noEmit`
Expected: sin nuevos errores relacionados a `campos/` (el proyecto puede tener errores preexistentes no relacionados; confirmar que no aparecen nuevos en `campos.controller.ts`/`campos.service.ts`).

- [ ] **Step 8: Commit**

```bash
git add fruit-backend/src/campos
git commit -m "feat(fruit-backend): agregar PATCH /campos/:id/poligono"
```

---

## Task 3: Servicio de agregación de Mapas de Calor (backend)

**Files:**
- Create: `fruit-backend/src/mapas-calor/dto/heatmap-query.dto.ts`
- Create: `fruit-backend/src/mapas-calor/mapas-calor.service.ts`
- Create: `fruit-backend/src/mapas-calor/mapas-calor.service.spec.ts`

- [ ] **Step 1: Crear el DTO de query params**

`fruit-backend/src/mapas-calor/dto/heatmap-query.dto.ts`:

```ts
import { IsOptional, IsISO8601 } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HeatmapQueryDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango (ISO 8601). Sin ella, se incluye todo el histórico.',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango (ISO 8601). Sin ella, se incluye todo el histórico.',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
```

- [ ] **Step 2: Escribir el test que falla**

`fruit-backend/src/mapas-calor/mapas-calor.service.spec.ts`:

```ts
import { MapasCalorService } from './mapas-calor.service';
import { PrismaService } from '@rubus/database';
import { Role } from '../auth/domain/enums/role.enum';
import { NotFoundException } from '@nestjs/common';

describe('MapasCalorService', () => {
  let prisma: {
    analysis: { groupBy: jest.Mock; count: jest.Mock; findMany: jest.Mock };
    campo: { findMany: jest.Mock; findUnique: jest.Mock };
  };
  let service: MapasCalorService;

  beforeEach(() => {
    prisma = {
      analysis: { groupBy: jest.fn(), count: jest.fn(), findMany: jest.fn() },
      campo: { findMany: jest.fn(), findUnique: jest.fn() },
    };
    service = new MapasCalorService(prisma as unknown as PrismaService);
  });

  describe('getCamposHeatmap()', () => {
    it('filtra por productorId cuando el scope es PRODUCTOR', async () => {
      prisma.analysis.groupBy.mockResolvedValue([]);
      prisma.analysis.count.mockResolvedValue(0);

      await service.getCamposHeatmap({ role: Role.PRODUCTOR, sub: 'prod-1' });

      expect(prisma.analysis.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ productorId: 'prod-1' }),
        }),
      );
    });

    it('filtra por camposAsignados cuando el scope es AGRONOMO', async () => {
      prisma.analysis.groupBy.mockResolvedValue([]);
      prisma.analysis.count.mockResolvedValue(0);

      await service.getCamposHeatmap({
        role: Role.AGRONOMO,
        sub: 'agro-1',
        camposAsignados: ['campo-1', 'campo-2'],
      });

      expect(prisma.analysis.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campoId: { in: ['campo-1', 'campo-2'] },
          }),
        }),
      );
    });

    it('no filtra por productor/campo cuando el scope es ADMIN', async () => {
      prisma.analysis.groupBy.mockResolvedValue([]);
      prisma.analysis.count.mockResolvedValue(0);

      await service.getCamposHeatmap({ role: Role.ADMIN, sub: 'admin-1' });

      const call = prisma.analysis.groupBy.mock.calls[0][0];
      expect(call.where.productorId).toBeUndefined();
      expect(call.where.campoId).toBeUndefined();
    });

    it('aplica el rango de fechas sobre fechaAnalisis cuando se pasa from/to', async () => {
      prisma.analysis.groupBy.mockResolvedValue([]);
      prisma.analysis.count.mockResolvedValue(0);

      await service.getCamposHeatmap(
        { role: Role.ADMIN, sub: 'admin-1' },
        '2026-01-01',
        '2026-01-31',
      );

      expect(prisma.analysis.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fechaAnalisis: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-01-31'),
            },
          }),
        }),
      );
    });

    it('arma la respuesta combinando agregados y datos del campo', async () => {
      prisma.analysis.groupBy.mockResolvedValue([
        {
          campoId: 'campo-1',
          _count: { _all: 5 },
          _sum: { totalElementosDetectados: 120 },
          _avg: {
            porcentajeMermaGeneral: 8.5,
            ubicacionLat: 19.7023,
            ubicacionLng: -103.3472,
          },
        },
      ]);
      prisma.analysis.count.mockResolvedValue(2);
      prisma.campo.findMany.mockResolvedValue([
        { id: 'campo-1', nombre: 'Huerta Norte', poligonoGps: [] },
      ]);

      const result = await service.getCamposHeatmap({
        role: Role.ADMIN,
        sub: 'admin-1',
      });

      expect(result).toEqual({
        campos: [
          {
            campoId: 'campo-1',
            nombre: 'Huerta Norte',
            poligonoGps: null,
            centroid: { lat: 19.7023, lng: -103.3472 },
            analysisCount: 5,
            totalElementosDetectados: 120,
            avgMermaPercent: 8.5,
          },
        ],
        sinUbicacion: 2,
      });
    });

    it('devuelve poligonoGps cuando el campo tiene al menos 3 puntos válidos', async () => {
      const poligono = [
        [-103.3472, 19.7023],
        [-103.3465, 19.7023],
        [-103.3465, 19.7015],
      ];
      prisma.analysis.groupBy.mockResolvedValue([
        {
          campoId: 'campo-1',
          _count: { _all: 1 },
          _sum: { totalElementosDetectados: 10 },
          _avg: { porcentajeMermaGeneral: 1, ubicacionLat: 19.7, ubicacionLng: -103.3 },
        },
      ]);
      prisma.analysis.count.mockResolvedValue(0);
      prisma.campo.findMany.mockResolvedValue([
        { id: 'campo-1', nombre: 'Huerta Norte', poligonoGps: poligono },
      ]);

      const result = await service.getCamposHeatmap({
        role: Role.ADMIN,
        sub: 'admin-1',
      });

      expect(result.campos[0].poligonoGps).toEqual(poligono);
    });

    it('no consulta prisma.campo.findMany cuando no hay campos agrupados', async () => {
      prisma.analysis.groupBy.mockResolvedValue([]);
      prisma.analysis.count.mockResolvedValue(3);

      const result = await service.getCamposHeatmap({
        role: Role.ADMIN,
        sub: 'admin-1',
      });

      expect(result).toEqual({ campos: [], sinUbicacion: 3 });
      expect(prisma.campo.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getAnalisisHeatmap()', () => {
    it('solo incluye análisis con coordenadas y ordena por fecha descendente', async () => {
      prisma.analysis.findMany.mockResolvedValue([
        {
          id: 'a-1',
          ubicacionLat: 19.7,
          ubicacionLng: -103.3,
          fechaAnalisis: new Date('2026-01-01'),
          variedad: 'Tupy',
          porcentajeMermaGeneral: 5,
          totalElementosDetectados: 20,
          elementosSanos: 18,
          elementosEnfermos: 2,
          validacionEstado: 'pendiente',
        },
      ]);

      const result = await service.getAnalisisHeatmap('campo-1');

      expect(prisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campoId: 'campo-1',
            ubicacionLat: { not: null },
            ubicacionLng: { not: null },
          }),
          orderBy: { fechaAnalisis: 'desc' },
        }),
      );
      expect(result[0]).toMatchObject({ id: 'a-1', lat: 19.7, lng: -103.3 });
    });
  });

  describe('assertCampoAccessible()', () => {
    it('ADMIN siempre tiene acceso', async () => {
      await expect(
        service.assertCampoAccessible('campo-1', {
          role: Role.ADMIN,
          sub: 'admin-1',
        }),
      ).resolves.toBeUndefined();
      expect(prisma.campo.findUnique).not.toHaveBeenCalled();
    });

    it('AGRONOMO con el campo asignado tiene acceso', async () => {
      await expect(
        service.assertCampoAccessible('campo-1', {
          role: Role.AGRONOMO,
          sub: 'agro-1',
          camposAsignados: ['campo-1'],
        }),
      ).resolves.toBeUndefined();
    });

    it('AGRONOMO sin el campo asignado recibe 404', async () => {
      await expect(
        service.assertCampoAccessible('campo-1', {
          role: Role.AGRONOMO,
          sub: 'agro-1',
          camposAsignados: ['otro-campo'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('PRODUCTOR dueño del campo tiene acceso', async () => {
      prisma.campo.findUnique.mockResolvedValue({ productorId: 'prod-1' });

      await expect(
        service.assertCampoAccessible('campo-1', {
          role: Role.PRODUCTOR,
          sub: 'prod-1',
        }),
      ).resolves.toBeUndefined();
    });

    it('PRODUCTOR que no es dueño recibe 404', async () => {
      prisma.campo.findUnique.mockResolvedValue({
        productorId: 'otro-productor',
      });

      await expect(
        service.assertCampoAccessible('campo-1', {
          role: Role.PRODUCTOR,
          sub: 'prod-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd fruit-backend && pnpm exec jest mapas-calor.service.spec.ts`
Expected: FAIL — no se puede resolver el módulo `./mapas-calor.service`.

- [ ] **Step 4: Implementar el servicio**

`fruit-backend/src/mapas-calor/mapas-calor.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { Role } from '../auth/domain/enums/role.enum';
import { type UserScope } from '../auth/domain/types/user-scope.type';

export interface CampoHeatmapPoint {
  campoId: string;
  nombre: string;
  poligonoGps: [number, number][] | null;
  centroid: { lat: number; lng: number };
  analysisCount: number;
  totalElementosDetectados: number;
  avgMermaPercent: number;
}

export interface CamposHeatmapResponse {
  campos: CampoHeatmapPoint[];
  sinUbicacion: number;
}

export interface AnalisisHeatmapPoint {
  id: string;
  lat: number;
  lng: number;
  fechaAnalisis: Date;
  variedad: string | null;
  porcentajeMermaGeneral: number;
  totalElementosDetectados: number;
  elementosSanos: number;
  elementosEnfermos: number;
  validacionEstado: string;
}

@Injectable()
export class MapasCalorService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(scope: UserScope): Record<string, unknown> {
    if (scope.role === Role.PRODUCTOR) return { productorId: scope.sub };
    if (scope.role === Role.AGRONOMO) {
      return { campoId: { in: scope.camposAsignados ?? [] } };
    }
    return {};
  }

  private dateWhere(from?: string, to?: string): Record<string, unknown> {
    if (!from && !to) return {};
    return {
      fechaAnalisis: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }

  async getCamposHeatmap(
    scope: UserScope,
    from?: string,
    to?: string,
  ): Promise<CamposHeatmapResponse> {
    const baseWhere = { ...this.scopeWhere(scope), ...this.dateWhere(from, to) };

    const grouped = await this.prisma.analysis.groupBy({
      by: ['campoId'],
      where: {
        ...baseWhere,
        ubicacionLat: { not: null },
        ubicacionLng: { not: null },
      },
      _count: { _all: true },
      _sum: { totalElementosDetectados: true },
      _avg: {
        porcentajeMermaGeneral: true,
        ubicacionLat: true,
        ubicacionLng: true,
      },
    });

    const sinUbicacion = await this.prisma.analysis.count({
      where: {
        ...baseWhere,
        OR: [{ ubicacionLat: null }, { ubicacionLng: null }],
      },
    });

    if (grouped.length === 0) return { campos: [], sinUbicacion };

    const campoIds = grouped.map((g) => g.campoId);
    const camposInfo = await this.prisma.campo.findMany({
      where: { id: { in: campoIds } },
      select: { id: true, nombre: true, poligonoGps: true },
    });
    const infoById = new Map(camposInfo.map((c) => [c.id, c]));

    const campos: CampoHeatmapPoint[] = grouped.map((g) => {
      const info = infoById.get(g.campoId);
      return {
        campoId: g.campoId,
        nombre: info?.nombre ?? g.campoId,
        poligonoGps: normalizePoligono(info?.poligonoGps),
        centroid: {
          lat: g._avg.ubicacionLat ?? 0,
          lng: g._avg.ubicacionLng ?? 0,
        },
        analysisCount: g._count._all,
        totalElementosDetectados: g._sum.totalElementosDetectados ?? 0,
        avgMermaPercent: g._avg.porcentajeMermaGeneral ?? 0,
      };
    });

    return { campos, sinUbicacion };
  }

  async getAnalisisHeatmap(
    campoId: string,
    from?: string,
    to?: string,
  ): Promise<AnalisisHeatmapPoint[]> {
    const rows = await this.prisma.analysis.findMany({
      where: {
        campoId,
        ubicacionLat: { not: null },
        ubicacionLng: { not: null },
        ...this.dateWhere(from, to),
      },
      select: {
        id: true,
        ubicacionLat: true,
        ubicacionLng: true,
        fechaAnalisis: true,
        variedad: true,
        porcentajeMermaGeneral: true,
        totalElementosDetectados: true,
        elementosSanos: true,
        elementosEnfermos: true,
        validacionEstado: true,
      },
      orderBy: { fechaAnalisis: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      lat: r.ubicacionLat as number,
      lng: r.ubicacionLng as number,
      fechaAnalisis: r.fechaAnalisis,
      variedad: r.variedad,
      porcentajeMermaGeneral: r.porcentajeMermaGeneral,
      totalElementosDetectados: r.totalElementosDetectados,
      elementosSanos: r.elementosSanos,
      elementosEnfermos: r.elementosEnfermos,
      validacionEstado: r.validacionEstado,
    }));
  }

  async assertCampoAccessible(campoId: string, scope: UserScope): Promise<void> {
    if (scope.role === Role.ADMIN) return;

    if (scope.role === Role.AGRONOMO) {
      if (!scope.camposAsignados?.includes(campoId)) {
        throw new NotFoundException(`Campo con id "${campoId}" no encontrado`);
      }
      return;
    }

    const campo = await this.prisma.campo.findUnique({
      where: { id: campoId },
      select: { productorId: true },
    });
    if (!campo || campo.productorId !== scope.sub) {
      throw new NotFoundException(`Campo con id "${campoId}" no encontrado`);
    }
  }
}

function normalizePoligono(value: unknown): [number, number][] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const valid = value.every(
    (p) =>
      Array.isArray(p) &&
      p.length === 2 &&
      typeof p[0] === 'number' &&
      typeof p[1] === 'number',
  );
  return valid ? (value as [number, number][]) : null;
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd fruit-backend && pnpm exec jest mapas-calor.service.spec.ts`
Expected: PASS (14 tests).

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/mapas-calor
git commit -m "feat(fruit-backend): agregar MapasCalorService (agregación por campo y por análisis)"
```

---

## Task 4: Controller y módulo de Mapas de Calor (backend)

**Files:**
- Create: `fruit-backend/src/mapas-calor/mapas-calor.controller.ts`
- Create: `fruit-backend/src/mapas-calor/mapas-calor.module.ts`
- Modify: `fruit-backend/src/app.module.ts`

- [ ] **Step 1: Crear el controller**

`fruit-backend/src/mapas-calor/mapas-calor.controller.ts`:

```ts
import { Controller, Get, Param, Query, UseGuards, Req, Inject } from '@nestjs/common';
import { MapasCalorService } from './mapas-calor.service';
import { HeatmapQueryDto } from './dto/heatmap-query.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import {
  I_USER_REPOSITORY,
  type IUserRepository,
} from '../auth/ports/user-repository.port';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('mapas-calor')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('MapasCalor')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class MapasCalorController {
  constructor(
    private readonly mapasCalorService: MapasCalorService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get('campos')
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO)
  @ApiOperation({
    summary: 'Vista general del mapa de calor',
    description:
      'Devuelve, por cada campo accesible con análisis geolocalizados, su polígono o centroide y los agregados de densidad/merma.',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Datos recuperados con éxito.' })
  @ApiResponse({ status: 401, description: 'Se requiere autenticación.' })
  async getCamposHeatmap(
    @Req() req: { user: JwtPayload },
    @Query() query: HeatmapQueryDto,
  ) {
    const scope = await this.buildScope(req.user);
    return this.mapasCalorService.getCamposHeatmap(scope, query.from, query.to);
  }

  @Get('campos/:campoId/analisis')
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO)
  @ApiOperation({
    summary: 'Análisis geolocalizados de un campo',
    description: 'Devuelve cada análisis geolocalizado de ese campo, para dibujar puntos individuales.',
  })
  @ApiParam({ name: 'campoId', type: String, description: 'UUID del campo.' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Datos recuperados con éxito.' })
  @ApiResponse({ status: 401, description: 'Se requiere autenticación.' })
  @ApiResponse({ status: 404, description: 'Campo no encontrado o sin acceso.' })
  async getAnalisisHeatmap(
    @Param('campoId') campoId: string,
    @Req() req: { user: JwtPayload },
    @Query() query: HeatmapQueryDto,
  ) {
    const scope = await this.buildScope(req.user);
    await this.mapasCalorService.assertCampoAccessible(campoId, scope);
    return this.mapasCalorService.getAnalisisHeatmap(campoId, query.from, query.to);
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

- [ ] **Step 2: Crear el módulo**

`fruit-backend/src/mapas-calor/mapas-calor.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MapasCalorController } from './mapas-calor.controller';
import { MapasCalorService } from './mapas-calor.service';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MapasCalorController],
  providers: [MapasCalorService],
})
export class MapasCalorModule {}
```

- [ ] **Step 3: Registrar el módulo en `AppModule`**

En `fruit-backend/src/app.module.ts`, agregar el import junto a los demás módulos por feature:

```ts
import { MapasCalorModule } from './mapas-calor/mapas-calor.module';
```

Y agregarlo al array `imports`, junto a `CamposModule`:

```ts
    CamposModule,
    MapasCalorModule,
```

- [ ] **Step 4: Levantar el servicio y verificar manualmente con Swagger**

Run: `cd fruit-backend && pnpm run start:dev`
Expected: arranca sin errores. Abrir `http://localhost:3001/api` (o el path configurado de Swagger) y confirmar que aparecen `GET /mapas-calor/campos` y `GET /mapas-calor/campos/{campoId}/analisis` bajo el tag "MapasCalor", y `PATCH /campos/{id}/poligono` bajo "Campos".

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/mapas-calor fruit-backend/src/app.module.ts
git commit -m "feat(fruit-backend): exponer endpoints de mapas de calor"
```

---

## Task 5: Dependencias de Leaflet y variable de entorno (frontend)

**Files:**
- Modify: `zarza-web/package.json`
- Create: `zarza-web/.env.example`
- Modify: `zarza-web/src/main.tsx`

- [ ] **Step 1: Agregar dependencias**

En `zarza-web/package.json`, agregar a `dependencies`:

```json
    "leaflet": "^1.9.4",
    "leaflet-draw": "^1.0.4",
    "leaflet.markercluster": "^1.5.3",
    "react-leaflet": "^4.2.1",
    "react-leaflet-cluster": "^2.1.0",
```

Y a `devDependencies`:

```json
    "@types/leaflet": "^1.9.8",
    "@types/leaflet-draw": "^1.0.11",
```

`react-leaflet` se fija en la serie 4.x a propósito: la 5.x requiere React 19 y este proyecto sigue en React 18.3.

- [ ] **Step 2: Instalar**

Run: `cd zarza-web && npm install`
Expected: instala sin errores de peer dependencies relacionados a React.

- [ ] **Step 3: Crear `.env.example`**

`zarza-web/.env.example` (archivo nuevo — hoy `zarza-web` no tiene ninguno):

```
# Token de Mapbox para la capa satelital del mapa de calor (opcional).
# Se consume vía la Raster Tiles API (no Mapbox GL JS) como una TileLayer más
# de Leaflet — cae en el bucket de 750k tiles/mes gratis de Mapbox, no en
# "Map Loads". Sin este token, el toggle de capa satelital queda oculto y
# solo se muestra la capa de calles (OpenStreetMap, no requiere token).
VITE_MAPBOX_TOKEN=
```

- [ ] **Step 4: Importar los estilos de Leaflet una sola vez**

En `zarza-web/src/main.tsx`, agregar al inicio del archivo, antes de los demás imports:

```ts
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
```

- [ ] **Step 5: Verificar que el build sigue funcionando**

Run: `cd zarza-web && npm run build`
Expected: termina sin errores (los imports de CSS no rompen `tsc -b`/`vite build`).

- [ ] **Step 6: Commit**

```bash
git add zarza-web/package.json zarza-web/package-lock.json zarza-web/.env.example zarza-web/src/main.tsx
git commit -m "feat(zarza-web): agregar dependencias de Leaflet para mapas de calor"
```

---

## Task 6: Escala de color y tipos compartidos (frontend)

**Files:**
- Create: `zarza-web/src/mapas-calor/types.ts`
- Create: `zarza-web/src/mapas-calor/metricColor.ts`

- [ ] **Step 1: Tipos compartidos**

`zarza-web/src/mapas-calor/types.ts`:

```ts
export type MetricaMapaCalor = 'densidad' | 'merma';

export interface CampoHeatmapPoint {
  campoId: string;
  nombre: string;
  poligonoGps: [number, number][] | null; // [lng, lat]
  centroid: { lat: number; lng: number };
  analysisCount: number;
  totalElementosDetectados: number;
  avgMermaPercent: number;
}

export interface CamposHeatmapResponse {
  campos: CampoHeatmapPoint[];
  sinUbicacion: number;
}

export interface AnalisisHeatmapPoint {
  id: string;
  lat: number;
  lng: number;
  fechaAnalisis: string;
  variedad: string | null;
  porcentajeMermaGeneral: number;
  totalElementosDetectados: number;
  elementosSanos: number;
  elementosEnfermos: number;
  validacionEstado: 'pendiente' | 'validado' | 'rechazado';
}
```

- [ ] **Step 2: Utilidad de escala de color**

`zarza-web/src/mapas-calor/metricColor.ts`:

```ts
import type { AnalisisHeatmapPoint, CampoHeatmapPoint, MetricaMapaCalor } from './types';

export function campoMetricValue(
  metrica: MetricaMapaCalor,
  campo: Pick<CampoHeatmapPoint, 'totalElementosDetectados' | 'avgMermaPercent'>,
): number {
  return metrica === 'densidad' ? campo.totalElementosDetectados : campo.avgMermaPercent;
}

export function analisisMetricValue(
  metrica: MetricaMapaCalor,
  analisis: Pick<AnalisisHeatmapPoint, 'totalElementosDetectados' | 'porcentajeMermaGeneral'>,
): number {
  return metrica === 'densidad'
    ? analisis.totalElementosDetectados
    : analisis.porcentajeMermaGeneral;
}

export function computeRange(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

const STOPS: [number, [number, number, number]][] = [
  [0, [34, 139, 34]],
  [0.5, [230, 180, 40]],
  [1, [220, 50, 40]],
];

export function colorForValue(value: number, min: number, max: number): string {
  const t = max <= min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  return interpolate(t);
}

function interpolate(t: number): string {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      const lt = (t - t0) / (t1 - t0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * lt);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * lt);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * lt);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = STOPS[STOPS.length - 1][1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/mapas-calor/types.ts zarza-web/src/mapas-calor/metricColor.ts
git commit -m "feat(zarza-web): tipos y escala de color para mapas de calor"
```

---

## Task 7: Toggle de capa calles/satélite (frontend)

**Files:**
- Create: `zarza-web/src/mapas-calor/MapLayerToggle.tsx`

- [ ] **Step 1: Escribir el componente**

`zarza-web/src/mapas-calor/MapLayerToggle.tsx`:

```tsx
import { Segmented } from 'antd';

export type MapLayer = 'calles' | 'satelite';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface Props {
  value: MapLayer;
  onChange: (layer: MapLayer) => void;
}

export function MapLayerToggle({ value, onChange }: Props) {
  if (!MAPBOX_TOKEN) return null;
  return (
    <Segmented
      value={value}
      onChange={(v) => onChange(v as MapLayer)}
      options={[
        { label: 'Calles', value: 'calles' },
        { label: 'Satélite', value: 'satelite' },
      ]}
    />
  );
}

export function tileLayerFor(layer: MapLayer): { url: string; attribution: string } {
  if (layer === 'satelite' && MAPBOX_TOKEN) {
    return {
      url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
    };
  }
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/mapas-calor/MapLayerToggle.tsx
git commit -m "feat(zarza-web): toggle de capa calles/satélite para mapas"
```

---

## Task 8: Hooks de datos de Mapas de Calor + extensión de `useCampos` (frontend)

**Files:**
- Create: `zarza-web/src/mapas-calor/hooks/useMapasCalor.ts`
- Modify: `zarza-web/src/campos/hooks/useCampos.ts`

- [ ] **Step 1: Hooks de mapas de calor**

`zarza-web/src/mapas-calor/hooks/useMapasCalor.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { AnalisisHeatmapPoint, CamposHeatmapResponse } from '../types';

export interface DateRange {
  from?: string;
  to?: string;
}

export function useCamposHeatmap(range: DateRange) {
  return useQuery<CamposHeatmapResponse>({
    queryKey: ['mapas-calor', 'campos', range.from ?? null, range.to ?? null],
    queryFn: () =>
      apiClient
        .get<CamposHeatmapResponse>('/mapas-calor/campos', { params: range })
        .then((r) => r.data),
  });
}

export function useAnalisisHeatmap(campoId: string | null, range: DateRange) {
  return useQuery<AnalisisHeatmapPoint[]>({
    queryKey: [
      'mapas-calor',
      'campos',
      campoId,
      'analisis',
      range.from ?? null,
      range.to ?? null,
    ],
    queryFn: () =>
      apiClient
        .get<AnalisisHeatmapPoint[]>(`/mapas-calor/campos/${campoId}/analisis`, {
          params: range,
        })
        .then((r) => r.data),
    enabled: !!campoId,
  });
}
```

- [ ] **Step 2: Extender `Campo` y agregar `useUpdateCampoPoligono`**

En `zarza-web/src/campos/hooks/useCampos.ts`, agregar el campo a la interfaz `Campo`:

```ts
export interface Campo {
  id: string;
  codigoCampo: string;
  nombre: string;
  productorId: string;
  productor: { id: string; email: string };
  poligonoGps: number[][] | null;
  createdAt: string;
}
```

Y agregar el hook nuevo, después de `useDeleteCampo`:

```ts
export function useUpdateCampoPoligono() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, poligono_gps }: { id: string; poligono_gps: number[][] }) =>
      apiClient
        .patch<Campo>(`/campos/${id}/poligono`, { poligono_gps })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campos'] }),
  });
}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/mapas-calor/hooks zarza-web/src/campos/hooks/useCampos.ts
git commit -m "feat(zarza-web): hooks de datos para mapas de calor y edición de polígono"
```

---

## Task 9: Vista general (mapa multi-campo) (frontend)

**Files:**
- Create: `zarza-web/src/mapas-calor/CamposOverviewMap.tsx`

- [ ] **Step 1: Escribir el componente**

`zarza-web/src/mapas-calor/CamposOverviewMap.tsx`:

```tsx
import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import type { CampoHeatmapPoint, MetricaMapaCalor } from './types';
import { tileLayerFor, type MapLayer } from './MapLayerToggle';
import { campoMetricValue, computeRange, colorForValue } from './metricColor';

interface Props {
  campos: CampoHeatmapPoint[];
  metrica: MetricaMapaCalor;
  layer: MapLayer;
  onSelectCampo: (campoId: string) => void;
}

function FitToCampos({ campos }: { campos: CampoHeatmapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (campos.length === 0) return;
    const bounds = campos.map((c): [number, number] => [c.centroid.lat, c.centroid.lng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [campos, map]);
  return null;
}

export function CamposOverviewMap({ campos, metrica, layer, onSelectCampo }: Props) {
  const tile = tileLayerFor(layer);
  const values = campos.map((c) => campoMetricValue(metrica, c));
  const { min, max } = computeRange(values);

  return (
    <MapContainer center={[19.7, -103.3]} zoom={10} style={{ height: '100%', width: '100%' }}>
      <TileLayer url={tile.url} attribution={tile.attribution} />
      <FitToCampos campos={campos} />
      {campos.map((campo) => {
        const value = campoMetricValue(metrica, campo);
        const color = colorForValue(value, min, max);
        const label = `${campo.nombre} — ${value.toFixed(1)}`;

        if (campo.poligonoGps) {
          return (
            <Polygon
              key={campo.campoId}
              positions={campo.poligonoGps.map(([lng, lat]): [number, number] => [lat, lng])}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.45, weight: 2 }}
              eventHandlers={{ click: () => onSelectCampo(campo.campoId) }}
            >
              <Tooltip>{label}</Tooltip>
            </Polygon>
          );
        }

        return (
          <CircleMarker
            key={campo.campoId}
            center={[campo.centroid.lat, campo.centroid.lng]}
            radius={14}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
            eventHandlers={{ click: () => onSelectCampo(campo.campoId) }}
          >
            <Tooltip>{label}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/mapas-calor/CamposOverviewMap.tsx
git commit -m "feat(zarza-web): vista general del mapa de calor (choropleth por campo)"
```

---

## Task 10: Vista de campo con clustering y popup (frontend)

**Files:**
- Create: `zarza-web/src/mapas-calor/AnalisisPopup.tsx`
- Create: `zarza-web/src/mapas-calor/CampoDetailMap.tsx`

- [ ] **Step 1: Popup de análisis**

`zarza-web/src/mapas-calor/AnalisisPopup.tsx`:

```tsx
import { Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { AnalisisHeatmapPoint } from './types';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const ESTADO_LABEL: Record<string, { color: string; label: string }> = {
  validado: { color: 'green', label: 'Validado' },
  rechazado: { color: 'red', label: 'Rechazado' },
  pendiente: { color: 'default', label: 'Pendiente' },
};

interface Props {
  analisis: AnalisisHeatmapPoint;
}

export function AnalisisPopup({ analisis }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const estado = ESTADO_LABEL[analisis.validacionEstado] ?? ESTADO_LABEL['pendiente'];

  function verDetecciones() {
    if (user?.role === Role.ADMIN || user?.role === Role.AGRONOMO) {
      navigate(`/analisis/${analisis.id}/revision-detecciones`);
    } else {
      navigate(`/analisis?id=${analisis.id}`);
    }
  }

  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {new Date(analisis.fechaAnalisis).toLocaleDateString('es-MX')}
        {analisis.variedad ? ` — ${analisis.variedad}` : ''}
      </div>
      <div style={{ fontSize: 12, marginBottom: 2 }}>
        Merma: {analisis.porcentajeMermaGeneral.toFixed(1)}%
      </div>
      <div style={{ fontSize: 12, marginBottom: 8 }}>
        Sanos: {analisis.elementosSanos} · Enfermos: {analisis.elementosEnfermos}
      </div>
      <Tag color={estado.color} style={{ marginBottom: 8 }}>
        {estado.label}
      </Tag>
      <div>
        <Button size="small" type="primary" onClick={verDetecciones} block>
          Ver detecciones
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mapa de detalle con clustering**

`zarza-web/src/mapas-calor/CampoDetailMap.tsx`:

```tsx
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { AnalisisHeatmapPoint, MetricaMapaCalor } from './types';
import { tileLayerFor, type MapLayer } from './MapLayerToggle';
import { analisisMetricValue, computeRange, colorForValue } from './metricColor';
import { AnalisisPopup } from './AnalisisPopup';

interface Props {
  analisis: AnalisisHeatmapPoint[];
  metrica: MetricaMapaCalor;
  layer: MapLayer;
  center: { lat: number; lng: number };
}

function FitToPoints({ points }: { points: AnalisisHeatmapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = points.map((p): [number, number] => [p.lat, p.lng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  }, [points, map]);
  return null;
}

export function CampoDetailMap({ analisis, metrica, layer, center }: Props) {
  const tile = tileLayerFor(layer);
  const values = analisis.map((a) => analisisMetricValue(metrica, a));
  const { min, max } = computeRange(values);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={16}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={tile.url} attribution={tile.attribution} />
      <FitToPoints points={analisis} />
      <MarkerClusterGroup chunkedLoading>
        {analisis.map((a) => {
          const color = colorForValue(analisisMetricValue(metrica, a), min, max);
          return (
            <CircleMarker
              key={a.id}
              center={[a.lat, a.lng]}
              radius={9}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 2 }}
            >
              <Popup>
                <AnalisisPopup analisis={a} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/mapas-calor/AnalisisPopup.tsx zarza-web/src/mapas-calor/CampoDetailMap.tsx
git commit -m "feat(zarza-web): vista de campo con clustering y popup de análisis"
```

---

## Task 11: Página Mapas de Calor, ruta y nav (frontend)

**Files:**
- Create: `zarza-web/src/mapas-calor/MapasCalorPage.tsx`
- Modify: `zarza-web/src/shared/AppShell.tsx`
- Modify: `zarza-web/src/App.tsx`

- [ ] **Step 1: Agregar clase de impresión al topbar de `AppShell`**

En `zarza-web/src/shared/AppShell.tsx`, dentro de `TopBar`, agregar `className="app-topbar"` al `div` raíz devuelto por la función (el que tiene `padding: '16px 32px'`):

```tsx
    <div className="app-topbar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20,
      padding: '16px 32px', flexShrink: 0,
```

- [ ] **Step 2: Agregar el item de navegación**

En `zarza-web/src/shared/AppShell.tsx`, en `GROUP_CAMPO`, agregar la entrada nueva junto a `/campos`:

```ts
const GROUP_CAMPO: NavItem[] = [
  { key: '/campos', label: 'Campos / Huertas', roles: [Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO] },
  { key: '/mapas-calor', label: 'Mapas de Calor', roles: [Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO] },
  { key: '/solicitudes', label: 'Solicitudes', roles: [Role.ADMIN, Role.AGRONOMO, Role.MONITOR] },
  { key: '/analisis', label: 'Revisión IA', roles: [Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR] },
  { key: '/revision-detecciones', label: 'Revisión de Detecciones', roles: [Role.ADMIN, Role.AGRONOMO] },
];
```

- [ ] **Step 3: Escribir la página**

`zarza-web/src/mapas-calor/MapasCalorPage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Empty, Segmented, Space, Typography } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useCamposHeatmap, useAnalisisHeatmap } from './hooks/useMapasCalor';
import { CamposOverviewMap } from './CamposOverviewMap';
import { CampoDetailMap } from './CampoDetailMap';
import { MapLayerToggle, type MapLayer } from './MapLayerToggle';
import type { MetricaMapaCalor } from './types';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export function MapasCalorPage() {
  const [metrica, setMetrica] = useState<MetricaMapaCalor>('merma');
  const [layer, setLayer] = useState<MapLayer>('calles');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [campoId, setCampoId] = useState<string | null>(null);

  const dateParams = useMemo(
    () => ({
      from: range?.[0]?.format('YYYY-MM-DD'),
      to: range?.[1]?.format('YYYY-MM-DD'),
    }),
    [range],
  );

  const camposQuery = useCamposHeatmap(dateParams);
  const analisisQuery = useAnalisisHeatmap(campoId, dateParams);

  const campoSeleccionado =
    camposQuery.data?.campos.find((c) => c.campoId === campoId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @media print {
          .app-topbar { display: none !important; }
          .mapas-calor-controls { display: none !important; }
          .mapas-calor-map {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999;
          }
        }
      `}</style>

      <div className="mapas-calor-controls" style={{ marginBottom: 16 }}>
        <Space
          align="center"
          style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 8 }}
        >
          <Space align="center">
            {campoId && (
              <Button icon={<ArrowLeftOutlined />} onClick={() => setCampoId(null)}>
                Todos los campos
              </Button>
            )}
            <Title level={4} style={{ margin: 0 }}>
              {campoSeleccionado ? campoSeleccionado.nombre : 'Mapas de Calor'}
            </Title>
          </Space>
          <Space wrap>
            <Segmented
              value={metrica}
              onChange={(v) => setMetrica(v as MetricaMapaCalor)}
              options={[
                { label: 'Merma / enfermedad', value: 'merma' },
                { label: 'Densidad de detecciones', value: 'densidad' },
              ]}
            />
            <RangePicker value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
            <MapLayerToggle value={layer} onChange={setLayer} />
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              Imprimir
            </Button>
          </Space>
        </Space>
        {!!camposQuery.data?.sinUbicacion && (
          <Alert
            style={{ marginTop: 12 }}
            type="info"
            showIcon
            message={`${camposQuery.data.sinUbicacion} análisis en este período no tienen ubicación GPS y no se muestran.`}
          />
        )}
      </div>

      <div className="mapas-calor-map" style={{ flex: 1, minHeight: 0 }}>
        {campoId ? (
          campoSeleccionado && analisisQuery.data ? (
            analisisQuery.data.length > 0 ? (
              <CampoDetailMap
                analisis={analisisQuery.data}
                metrica={metrica}
                layer={layer}
                center={campoSeleccionado.centroid}
              />
            ) : (
              <Empty description="Este campo no tiene análisis geolocalizados en el rango seleccionado" />
            )
          ) : null
        ) : camposQuery.data && camposQuery.data.campos.length > 0 ? (
          <CamposOverviewMap
            campos={camposQuery.data.campos}
            metrica={metrica}
            layer={layer}
            onSelectCampo={setCampoId}
          />
        ) : (
          <Empty description="No hay campos con análisis geolocalizados en el rango seleccionado" />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Agregar la ruta**

En `zarza-web/src/App.tsx`, agregar el import:

```ts
import { MapasCalorPage } from './mapas-calor/MapasCalorPage';
```

Y la ruta, junto a la de `/campos`:

```tsx
          <Route
            element={
              <PrivateRoute
                allowedRoles={[Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO]}
              />
            }
          >
            <Route path="/campos" element={<CamposPage />} />
            <Route path="/mapas-calor" element={<MapasCalorPage />} />
          </Route>
```

- [ ] **Step 5: Verificar en el navegador**

Run: `cd zarza-web && npm run dev` (con `fruit-backend` corriendo en paralelo)
Expected: al loguearse como ADMIN/PRODUCTOR/AGRONOMO y navegar a `/mapas-calor`, aparece el nav item, la página carga (mapa vacío u con campos según los datos de prueba disponibles), el filtro de fecha y el selector de métrica responden, y "Imprimir" abre el diálogo de impresión del navegador con el topbar y los controles ocultos.

- [ ] **Step 6: Commit**

```bash
git add zarza-web/src/mapas-calor/MapasCalorPage.tsx zarza-web/src/shared/AppShell.tsx zarza-web/src/App.tsx
git commit -m "feat(zarza-web): página de Mapas de Calor con filtros, drill-in e impresión"
```

---

## Task 12: Editor de polígono de campo (frontend)

**Files:**
- Create: `zarza-web/src/campos/EditCampoPolygonModal.tsx`

- [ ] **Step 1: Escribir el componente**

`zarza-web/src/campos/EditCampoPolygonModal.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Modal, notification } from 'antd';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import { useUpdateCampoPoligono, type Campo } from './hooks/useCampos';
import { MapLayerToggle, tileLayerFor, type MapLayer } from '../mapas-calor/MapLayerToggle';

interface Props {
  campo: Campo | null;
  open: boolean;
  onClose: () => void;
}

function DrawLayer({
  initialPoligono,
  onChange,
}: {
  initialPoligono: number[][] | null;
  onChange: (points: number[][]) => void;
}) {
  const map = useMap();
  const featureGroupRef = useRef(new L.FeatureGroup());

  useEffect(() => {
    const featureGroup = featureGroupRef.current;
    map.addLayer(featureGroup);

    if (initialPoligono && initialPoligono.length >= 3) {
      const latlngs = initialPoligono.map(([lng, lat]) => L.latLng(lat, lng));
      const polygon = L.polygon(latlngs);
      featureGroup.addLayer(polygon);
      map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
    }

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        marker: false,
        circle: false,
        circlemarker: false,
        polyline: false,
        rectangle: false,
      },
      edit: { featureGroup, remove: true },
    });
    map.addControl(drawControl);

    function emitCurrentPolygon() {
      const layers = featureGroup.getLayers() as L.Polygon[];
      if (layers.length === 0) {
        onChange([]);
        return;
      }
      const latlngs = layers[0].getLatLngs()[0] as L.LatLng[];
      onChange(latlngs.map((ll) => [ll.lng, ll.lat]));
    }

    map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      featureGroup.clearLayers();
      featureGroup.addLayer((e as unknown as { layer: L.Layer }).layer);
      emitCurrentPolygon();
    });
    map.on(L.Draw.Event.EDITED, emitCurrentPolygon);
    map.on(L.Draw.Event.DELETED, emitCurrentPolygon);

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(featureGroup);
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.EDITED);
      map.off(L.Draw.Event.DELETED);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

export function EditCampoPolygonModal({ campo, open, onClose }: Props) {
  const [layer, setLayer] = useState<MapLayer>('calles');
  const [draftPoints, setDraftPoints] = useState<number[][]>(campo?.poligonoGps ?? []);
  const updateMutation = useUpdateCampoPoligono();

  useEffect(() => {
    setDraftPoints(campo?.poligonoGps ?? []);
  }, [campo]);

  async function handleSave() {
    if (!campo) return;
    if (draftPoints.length < 3) {
      notification.error({ message: 'El polígono debe tener al menos 3 puntos' });
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: campo.id, poligono_gps: draftPoints });
      notification.success({ message: 'Límites del campo actualizados' });
      onClose();
    } catch {
      notification.error({ message: 'Error al guardar los límites del campo' });
    }
  }

  const tile = tileLayerFor(layer);

  return (
    <Modal
      title={campo ? `Editar límites — ${campo.nombre}` : 'Editar límites'}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={updateMutation.isPending}
      width="90vw"
      style={{ top: 20 }}
      okButtonProps={{ disabled: draftPoints.length < 3 }}
    >
      <div style={{ marginBottom: 8 }}>
        <MapLayerToggle value={layer} onChange={setLayer} />
      </div>
      <div style={{ height: '70vh' }}>
        {open && (
          <MapContainer center={[19.7, -103.3]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={tile.url} attribution={tile.attribution} />
            <DrawLayer initialPoligono={campo?.poligonoGps ?? null} onChange={setDraftPoints} />
          </MapContainer>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos. Si `@types/leaflet-draw` no expone `L.Control.Draw`/`L.Draw.Event` correctamente, revisar que la versión instalada declare esos símbolos (son parte estándar del paquete de tipos).

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/campos/EditCampoPolygonModal.tsx
git commit -m "feat(zarza-web): editor de polígono de campo con leaflet-draw"
```

---

## Task 13: Acción "Editar límites" en `CamposPage` (frontend)

**Files:**
- Modify: `zarza-web/src/campos/CamposPage.tsx`

- [ ] **Step 1: Wirear el modal en la tabla**

En `zarza-web/src/campos/CamposPage.tsx`, actualizar los imports:

```tsx
import { useState } from 'react';
import {
  Button,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  notification,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useCampos,
  useDeleteCampo,
  useAgronomosList,
  useAssignAgronomoToCampo,
  type Campo,
} from './hooks/useCampos';
import { CreateCampoModal } from './CreateCampoModal';
import { EditCampoPolygonModal } from './EditCampoPolygonModal';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
```

Agregar el estado y el helper de permisos dentro de `CamposPage`, junto a los demás `useState`:

```ts
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampo, setEditingCampo] = useState<Campo | null>(null);

  const canCreate = user?.role === Role.ADMIN || user?.role === Role.PRODUCTOR;
  const canDelete = user?.role === Role.ADMIN;

  function canEditPoligono(campo: Campo): boolean {
    if (user?.role === Role.ADMIN) return true;
    return user?.role === Role.PRODUCTOR && campo.productorId === user.sub;
  }
```

Agregar la columna "Límites" en `columns`, justo después de la columna "Alta" y antes del spread condicional de `canDelete`:

```ts
    {
      title: 'Alta',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
    },
    {
      title: 'Límites',
      key: 'poligono',
      render: (_: unknown, record: Campo) =>
        canEditPoligono(record) ? (
          <Button
            size="small"
            icon={<EnvironmentOutlined />}
            onClick={() => setEditingCampo(record)}
          >
            Editar límites
          </Button>
        ) : record.poligonoGps ? (
          <Tag color="green">Definidos</Tag>
        ) : (
          <Tag>Sin definir</Tag>
        ),
    },
    ...(canDelete
```

Y renderizar el modal al final del JSX devuelto, junto a `CreateCampoModal`:

```tsx
      <CreateCampoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
      <EditCampoPolygonModal
        campo={editingCampo}
        open={!!editingCampo}
        onClose={() => setEditingCampo(null)}
      />
```

- [ ] **Step 2: Verificar en el navegador**

Run: `cd zarza-web && npm run dev`
Expected: en `/campos`, un ADMIN ve "Editar límites" en toda fila; un PRODUCTOR solo en sus propios campos (los de otros productores muestran el `Tag`); un AGRONOMO no ve el botón en ninguna fila. Al abrir el editor, dibujar un polígono nuevo (3+ puntos) habilita "Aceptar"; al guardar, la tabla y (si se navega ahí) el mapa de calor reflejan el polígono nuevo.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/campos/CamposPage.tsx
git commit -m "feat(zarza-web): agregar acción de editar límites en CamposPage"
```

---

## Task 14: Deep link `?id=` en `AnalisisPage` (frontend)

**Files:**
- Modify: `zarza-web/src/analisis/AnalisisPage.tsx`

- [ ] **Step 1: Leer el query param y abrir el modal**

En `zarza-web/src/analisis/AnalisisPage.tsx`, agregar el import de `useSearchParams` junto al de `useState`:

```tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
```

Y modificar la función `AnalisisPage` (no `AnalisisTab`, que no cambia):

```tsx
export function AnalisisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkId = searchParams.get('id');

  function closeDeepLink() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('id');
      return next;
    });
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        Revisión de Análisis
      </Title>
      <Tabs
        defaultActiveKey="pendientes"
        items={[
          {
            key: 'pendientes',
            label: 'Pendientes',
            children: <AnalisisTab estado="pendiente" />,
          },
          {
            key: 'validados',
            label: 'Validados',
            children: <AnalisisTab estado="validado" />,
          },
          {
            key: 'rechazados',
            label: 'Rechazados',
            children: <AnalisisTab estado="rechazado" />,
          },
        ]}
      />
      <AnalisisDetailModal
        analysisId={deepLinkId}
        open={!!deepLinkId}
        onClose={closeDeepLink}
      />
    </div>
  );
}
```

`AnalisisDetailModal` ya está importado en el archivo (lo usa `AnalisisTab`); no hace falta agregar el import.

- [ ] **Step 2: Verificar en el navegador**

Con la app corriendo, loguear como PRODUCTOR y navegar directo a `/analisis?id=<uuid-de-un-analisis-propio>`. Expected: el modal de detalle se abre automáticamente al cargar la página, sin necesidad de click en la tabla; al cerrarlo, el query param `id` desaparece de la URL. Repetir con un id que no le pertenece a ese productor: el modal debe mostrar el error/estado vacío que ya maneja `useAnalisisDetail` para un 404 (sin cambios adicionales, ya cubierto por el scoping existente del backend).

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/analisis/AnalisisPage.tsx
git commit -m "feat(zarza-web): soportar ?id= en /analisis para abrir el detalle directo"
```

---

## Task 15: Verificación end-to-end del golden path

**Files:** ninguno (solo verificación manual).

- [ ] **Step 1: Backend — suite completa**

Run: `cd fruit-backend && pnpm run test`
Expected: PASS, incluyendo los tests nuevos de `campos.service.spec.ts` y `mapas-calor.service.spec.ts`.

- [ ] **Step 2: Backend — lint y build**

Run: `cd fruit-backend && pnpm run lint && pnpm run build`
Expected: sin errores nuevos.

- [ ] **Step 3: Frontend — build**

Run: `cd zarza-web && npm run build`
Expected: sin errores de tipos ni de build.

- [ ] **Step 4: Golden path manual (ADMIN)**

Con el stack corriendo (`docker compose up postgres rabbitmq redis` + `fruit-backend`/`fruit-ms` en dev + `zarza-web` en dev), y al menos un campo con análisis que tengan `ubicacionLat`/`ubicacionLng`:

1. Ir a `/mapas-calor`. Ver el mapa general con al menos un marcador/polígono.
2. Cambiar el selector de métrica y confirmar que los colores cambian.
3. Aplicar un rango de fechas que excluya todos los análisis; confirmar el estado vacío.
4. Click en un campo → drill-in a la vista de puntos individuales, con breadcrumb "Todos los campos".
5. Click en un punto → popup con resumen; click en "Ver detecciones" → navega a `/analisis/:id/revision-detecciones`.
6. Volver a `/mapas-calor`, activar capa satélite (si `VITE_MAPBOX_TOKEN` está configurado) y confirmar que cambian los tiles.
7. Click en "Imprimir" → diálogo de impresión con el mapa a pantalla completa, sin topbar ni controles.
8. Ir a `/campos`, click en "Editar límites" de un campo propio, dibujar un polígono, guardar, y confirmar que la vista general de `/mapas-calor` ahora pinta ese campo como polígono relleno en vez de círculo.

- [ ] **Step 5: Golden path manual (PRODUCTOR)**

Repetir pasos 1, 2, 4 y 5 logueado como PRODUCTOR: en el paso 5, "Ver detecciones" debe navegar a `/analisis?id=:id` y abrir el modal de detalle (sin imagen, ya que `useAnalisisImage` sigue deshabilitado para PRODUCTOR).

- [ ] **Step 6: Golden path manual (AGRONOMO)**

Confirmar que solo ve sus campos asignados en la vista general, que no ve el botón "Editar límites" en `/campos`, y que "Ver detecciones" navega a `/analisis/:id/revision-detecciones` igual que ADMIN.

No requiere commit — es un checkpoint de verificación.
