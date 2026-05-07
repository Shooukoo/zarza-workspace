# AGRONOMO Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix el 403 del AGRONOMO, agregar scoping por campos asignados en `/analyses` y `/campos`, extender la validación de análisis con estado enum + acción rápida Validar/Rechazar, columna Agrónomo en CamposPage, y notificación WebSocket al Productor.

**Architecture:** `fruit-backend/src/analyses/` escribe directamente a MongoDB (no vía RabbitMQ). `fruit-ms` también escribe al mismo collection al procesar imágenes. El campo `campos_asignados` ya existe en el User schema y es el mecanismo de asignación para AGRONOMO (mismo patrón que MONITOR).

**Tech Stack:** NestJS 11 + Fastify, Mongoose, React + Ant Design + TanStack Query, WebSocket nativo (ws library), class-validator

---

## File Map

| Archivo | Acción |
|---------|--------|
| `zarza-web/src/auth/defaultRoute.ts` | CREAR |
| `zarza-web/src/auth/AuthContext.tsx` | MODIFICAR — `login()` retorna `AuthUser` |
| `zarza-web/src/auth/LoginPage.tsx` | MODIFICAR — usar `defaultRouteForRole` |
| `fruit-backend/src/analyses/analyses.schema.ts` | MODIFICAR — añadir `estado`, `fecha_validacion` |
| `fruit-ms/src/fruits/schemas/analysis.schema.ts` | MODIFICAR — añadir `estado` default en `validacion_experto` |
| `fruit-backend/src/analyses/dto/validate-analysis.dto.ts` | MODIFICAR — añadir `action`, hacer `cronograma_corregido` opcional |
| `fruit-backend/src/analyses/analyses.service.ts` | MODIFICAR — usar `estado`, soportar `action`, scope AGRONOMO |
| `fruit-backend/src/analyses/analyses.controller.ts` | MODIFICAR — add ADMIN role, scope AGRONOMO, inject NotificationsGateway |
| `fruit-backend/src/analyses/analyses.module.ts` | MODIFICAR — importar NotificationsModule |
| `fruit-backend/src/campos/campos.controller.ts` | MODIFICAR — scope AGRONOMO vía camposAsignados |
| `fruit-backend/src/campos/campos.service.ts` | MODIFICAR — añadir `findByIds` |
| `zarza-web/src/campos/hooks/useCampos.ts` | MODIFICAR — añadir `useAgronmosList`, `useAssignAgronomoToCampo` |
| `zarza-web/src/campos/CamposPage.tsx` | MODIFICAR — columna Agrónomo |
| `zarza-web/src/analisis/types.ts` | MODIFICAR — añadir `estado` a `ValidacionExperto`, update `ValidateAnalisisPayload` |
| `zarza-web/src/analisis/useAnalisis.ts` | MODIFICAR — `useAnalisisList` usa `estado`, añadir `useApproveAnalisis` |
| `zarza-web/src/analisis/AnalisisPage.tsx` | MODIFICAR — badge `estado`, botones Validar/Rechazar, tab Rechazados |
| `zarza-web/src/analisis/AnalisisDetailModal.tsx` | MODIFICAR — pasar `action: 'rechazado'` en submit |
| `zarza-web/vite.config.ts` | MODIFICAR — proxy `/ws` con `ws: true` |
| `zarza-web/src/shared/useWebSocket.ts` | CREAR |
| `zarza-web/src/shared/AppShell.tsx` | MODIFICAR — listener `analysis_validated` para PRODUCTOR |

---

## Task 1: Fix 403 — Redirect por Rol Post-Login

**Files:**
- Create: `zarza-web/src/auth/defaultRoute.ts`
- Modify: `zarza-web/src/auth/AuthContext.tsx`
- Modify: `zarza-web/src/auth/LoginPage.tsx`

- [ ] **Step 1: Crear `defaultRoute.ts`**

```ts
// zarza-web/src/auth/defaultRoute.ts
import { Role } from './types';

export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case Role.AGRONOMO: return '/analisis';
    case Role.MONITOR: return '/solicitudes';
    default: return '/dashboard';
  }
}
```

- [ ] **Step 2: Hacer que `login()` retorne `AuthUser`**

En `zarza-web/src/auth/AuthContext.tsx`, cambiar la interfaz y la función `login`:

```ts
// Línea 14 — cambiar tipo de retorno
login: (email: string, password: string) => Promise<AuthUser>;
```

```ts
// Líneas 33-40 — cambiar implementación
async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiClient.post<{
    user: { id: string; email: string; role: Role };
  }>('/auth/login', { email, password });
  const u = res.data.user;
  const authUser: AuthUser = { sub: u.id, email: u.email, role: u.role };
  setUser(authUser);
  return authUser;
}
```

- [ ] **Step 3: Usar `defaultRouteForRole` en `LoginPage.tsx`**

```ts
// Línea 1 — añadir import
import { defaultRouteForRole } from './defaultRoute';
```

```ts
// Líneas 21-23 — reemplazar navigate fijo
const loggedUser = await login(values.email, values.password);
navigate(defaultRouteForRole(loggedUser.role), { replace: true });
```

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/auth/defaultRoute.ts zarza-web/src/auth/AuthContext.tsx zarza-web/src/auth/LoginPage.tsx
git commit -m "fix(auth): redirect AGRONOMO to /analisis and MONITOR to /solicitudes after login"
```

---

## Task 2: Añadir `estado` a los schemas de Analysis

**Files:**
- Modify: `fruit-backend/src/analyses/analyses.schema.ts`
- Modify: `fruit-ms/src/fruits/schemas/analysis.schema.ts`

- [ ] **Step 1: Extender `validacion_experto` en `analyses.schema.ts` (fruit-backend)**

En `fruit-backend/src/analyses/analyses.schema.ts`, dentro de `validacion_experto`, añadir dos campos nuevos (después de `fue_corregido`):

```ts
// Reemplazar el bloque validacion_experto completo:
validacion_experto: {
  fue_corregido: { type: Boolean, default: false },
  estado: {
    type: String,
    enum: ['pendiente', 'validado', 'rechazado'],
    default: 'pendiente',
  },
  corregido_por: { type: SchemaTypes.ObjectId, ref: 'User' },
  fecha_correccion: { type: Date },
  fecha_validacion: { type: Date },
  diagnostico_original: { type: String },
  cronograma_corregido: [CronogramaCorregidoSchema],
  observaciones: { type: String },
},
```

Actualizar la interfaz `ValidacionExperto`:

```ts
export interface ValidacionExperto {
  fue_corregido: boolean;
  estado?: 'pendiente' | 'validado' | 'rechazado';
  corregido_por?: Types.ObjectId;
  fecha_correccion?: Date;
  fecha_validacion?: Date;
  diagnostico_original?: string;
  cronograma_corregido?: CronogramaCorregido[];
  observaciones?: string;
}
```

- [ ] **Step 2: Extender `validacion_experto` en `analysis.schema.ts` (fruit-ms)**

En `fruit-ms/src/fruits/schemas/analysis.schema.ts`, dentro del `new MongooseSchema` de `validacion_experto`, añadir el campo `estado`:

```ts
// Reemplazar el MongooseSchema interno de validacion_experto:
type: new MongooseSchema(
  {
    fue_corregido:        { type: Boolean, default: false },
    estado:               { type: String, enum: ['pendiente', 'validado', 'rechazado'], default: 'pendiente' },
    corregido_por:        { type: SchemaTypes.ObjectId, ref: 'User', default: null },
    diagnostico_original: { type: String, default: null },
  },
  { _id: false },
),
default: () => ({ fue_corregido: false, estado: 'pendiente' }),
```

Actualizar también `AnalysisDocument` interface en ese mismo archivo añadiendo `estado?` al subdocumento `validacion_experto`:

```ts
validacion_experto: {
  fue_corregido:      boolean;
  estado?:            'pendiente' | 'validado' | 'rechazado';
  corregido_por:      Types.ObjectId | null;
  diagnostico_original: string | null;
};
```

- [ ] **Step 3: Commit**

```bash
git add fruit-backend/src/analyses/analyses.schema.ts fruit-ms/src/fruits/schemas/analysis.schema.ts
git commit -m "feat(schema): add validacion_experto.estado enum to analyses collection"
```

---

## Task 3: Extender endpoint de validación

**Files:**
- Modify: `fruit-backend/src/analyses/dto/validate-analysis.dto.ts`
- Modify: `fruit-backend/src/analyses/analyses.service.ts`
- Modify: `fruit-backend/src/analyses/analyses.controller.ts`
- Modify: `fruit-backend/src/analyses/analyses.module.ts`

- [ ] **Step 1: Actualizar `ValidateAnalysisDto`**

Reemplazar `fruit-backend/src/analyses/dto/validate-analysis.dto.ts` completo:

```ts
import {
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CronogramaCorregidoItemDto {
  @IsString()
  etapa: string;

  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class ValidateAnalysisDto {
  @IsEnum(['validado', 'rechazado'])
  action: 'validado' | 'rechazado';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CronogramaCorregidoItemDto)
  cronograma_corregido?: CronogramaCorregidoItemDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}
```

- [ ] **Step 2: Actualizar `analyses.service.ts` — método `validate` y `findAll`**

Reemplazar el método `validate` completo en `fruit-backend/src/analyses/analyses.service.ts`:

```ts
async validate(
  id: string,
  corregidoPorId: string,
  dto: ValidateAnalysisDto,
): Promise<AnalysisDocument> {
  const existing = await this.findById(id);

  const setFields: Record<string, unknown> = {
    'validacion_experto.estado': dto.action,
    'validacion_experto.corregido_por': new Types.ObjectId(corregidoPorId),
    'validacion_experto.fecha_validacion': new Date(),
  };

  if (dto.action === 'rechazado' && dto.cronograma_corregido?.length) {
    const diagnosticoOriginal =
      existing.validacion_experto?.fue_corregido
        ? existing.validacion_experto.diagnostico_original
        : JSON.stringify(existing.cronograma_fenologico);

    setFields['validacion_experto.fue_corregido'] = true;
    setFields['validacion_experto.fecha_correccion'] = new Date();
    setFields['validacion_experto.diagnostico_original'] = diagnosticoOriginal;
    setFields['validacion_experto.cronograma_corregido'] = dto.cronograma_corregido;
    setFields['validacion_experto.observaciones'] = dto.observaciones ?? '';
  }

  const updated = await this.analysisModel
    .findByIdAndUpdate(id, { $set: setFields }, { new: true })
    .lean<AnalysisDocument>()
    .exec();

  if (!updated) throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
  this.logger.log(`Análisis ${id} ${dto.action} por usuario ${corregidoPorId}`);
  return updated;
}
```

Actualizar también el método `findAll` para filtrar por `estado` (reemplazar el parámetro `validado` por `estado`):

```ts
async findAll(
  page: number,
  limit: number,
  estado: 'pendiente' | 'validado' | 'rechazado' | 'all',
  scope: UserScope,
): Promise<{ data: AnalysisDocument[]; total: number; page: number; limit: number }> {
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = {};

  if (estado === 'pendiente') {
    query['validacion_experto.estado'] = { $in: ['pendiente', null] };
  } else if (estado === 'validado') {
    query['validacion_experto.estado'] = 'validado';
  } else if (estado === 'rechazado') {
    query['validacion_experto.estado'] = 'rechazado';
  }

  if (scope.role === Role.PRODUCTOR) {
    query.productor_id = new Types.ObjectId(scope.sub);
  }
  if (scope.role === Role.AGRONOMO && scope.camposAsignados?.length) {
    query.campo_id = {
      $in: scope.camposAsignados
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id)),
    };
  }

  const [data, total] = await Promise.all([
    this.analysisModel
      .find(query)
      .sort({ fecha_analisis: -1 })
      .skip(skip)
      .limit(limit)
      .lean<AnalysisDocument[]>()
      .exec(),
    this.analysisModel.countDocuments(query),
  ]);

  return { data, total, page, limit };
}
```

- [ ] **Step 3: Actualizar `analyses.controller.ts`**

Reemplazar el archivo completo `fruit-backend/src/analyses/analyses.controller.ts`:

```ts
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
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('estado') estadoParam?: string,
  ) {
    let estado: 'pendiente' | 'validado' | 'rechazado' | 'all' = 'pendiente';
    if (estadoParam === 'validado') estado = 'validado';
    else if (estadoParam === 'rechazado') estado = 'rechazado';
    else if (estadoParam === 'all') estado = 'all';
    else if (estadoParam !== undefined && estadoParam !== 'pendiente') {
      throw new BadRequestException('estado must be pendiente, validado, rechazado, or all');
    }
    const scope = await this.buildScope(req.user);
    return this.analysesService.findAll(page, limit, estado, scope);
  }

  @Get(':id/image')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async getImage(@Param('id') id: string) {
    const url = await this.analysesService.getImageUrl(id);
    return { url };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    if (scope.role === Role.PRODUCTOR && analysis.productor_id?.toString() !== scope.sub) {
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
      productorId: result.productor_id?.toString(),
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

- [ ] **Step 4: Actualizar `analyses.module.ts` — importar NotificationsModule**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { Analysis, AnalysisSchema } from './analyses.schema';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Analysis.name, schema: AnalysisSchema }]),
    AuthModule,
    StorageModule,
    NotificationsModule,
  ],
  controllers: [AnalysesController],
  providers: [AnalysesService],
})
export class AnalysesModule {}
```

- [ ] **Step 5: Verificar que el backend compila**

```bash
cd fruit-backend && pnpm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/analyses/
git commit -m "feat(analyses): add action-based validate endpoint with estado enum and WebSocket notification"
```

---

## Task 4: AGRONOMO Scoping en GET /campos

**Files:**
- Modify: `fruit-backend/src/campos/campos.controller.ts`
- Modify: `fruit-backend/src/campos/campos.service.ts`

- [ ] **Step 1: Añadir `findByIds` a `CamposService`**

En `fruit-backend/src/campos/campos.service.ts`, agregar el método después de `findAll`:

```ts
async findByIds(ids: string[]): Promise<CampoDocument[]> {
  if (!ids.length) return [];
  const objectIds = ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  return this.campoModel
    .find({ _id: { $in: objectIds } })
    .lean<CampoDocument[]>()
    .exec();
}
```

- [ ] **Step 2: Inyectar `IUserRepository` en `CamposController` y agregar scope para AGRONOMO**

Reemplazar `fruit-backend/src/campos/campos.controller.ts` completo:

```ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Inject,
} from '@nestjs/common';
import { CamposService } from './campos.service';
import { CreateCampoDto } from './dto/create-campo.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';

@Controller('campos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CamposController {
  constructor(
    private readonly camposService: CamposService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO, Role.MONITOR)
  async findAll(@Req() req: any, @Query('productor_id') productorId?: string) {
    const user = req.user;
    if (user.role === Role.AGRONOMO) {
      const userDoc = await this.userRepository.findById(user.sub);
      return this.camposService.findByIds(userDoc?.camposAsignados ?? []);
    }
    const filterById = user.role === Role.PRODUCTOR ? user.sub : productorId;
    return this.camposService.findAll(filterById);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO, Role.MONITOR)
  findById(@Param('id') id: string) {
    return this.camposService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  create(@Body() dto: CreateCampoDto) {
    return this.camposService.create(dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.camposService.delete(id);
  }
}
```

- [ ] **Step 3: Verificar que `campos.module.ts` ya importa `AuthModule`**

Leer `fruit-backend/src/campos/campos.module.ts` y confirmar que `AuthModule` está en `imports`. Ya está — no requiere cambios.

- [ ] **Step 4: Verificar compilación**

```bash
cd fruit-backend && pnpm run build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/campos/campos.controller.ts fruit-backend/src/campos/campos.service.ts
git commit -m "feat(campos): scope GET /campos by camposAsignados when role is AGRONOMO"
```

---

## Task 5: Columna Agrónomo en CamposPage

**Files:**
- Modify: `zarza-web/src/campos/hooks/useCampos.ts`
- Modify: `zarza-web/src/campos/CamposPage.tsx`

- [ ] **Step 1: Añadir hooks en `useCampos.ts`**

Al final de `zarza-web/src/campos/hooks/useCampos.ts`, añadir:

```ts
export interface AgronomoUser {
  id: string;
  email: string;
  campos_asignados: string[];
}

export function useAgronmosList() {
  return useQuery<AgronomoUser[]>({
    queryKey: ['admin', 'users', 'AGRONOMO'],
    queryFn: () =>
      apiClient
        .get<{ data: AgronomoUser[] }>('/admin/users?rol=AGRONOMO&limit=200')
        .then((r) => r.data.data),
  });
}

export function useAssignAgronomoToCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campoId,
      newAgronomoId,
      agronoms,
    }: {
      campoId: string;
      newAgronomoId: string | null;
      agronoms: AgronomoUser[];
    }) => {
      const old = agronoms.find((a) => a.campos_asignados.includes(campoId));

      if (old && old.id !== newAgronomoId) {
        const newList = old.campos_asignados.filter((id) => id !== campoId);
        await apiClient.patch(`/admin/users/${old.id}/campos`, {
          campos_ids: newList,
        });
      }

      if (newAgronomoId) {
        const nw = agronoms.find((a) => a.id === newAgronomoId);
        const current = nw?.campos_asignados ?? [];
        if (!current.includes(campoId)) {
          await apiClient.patch(`/admin/users/${newAgronomoId}/campos`, {
            campos_ids: [...current, campoId],
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'AGRONOMO'] });
    },
  });
}
```

- [ ] **Step 2: Añadir columna Agrónomo en `CamposPage.tsx`**

Reemplazar `zarza-web/src/campos/CamposPage.tsx` completo:

```tsx
import { useState } from 'react';
import {
  Button,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  notification,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useCampos,
  useDeleteCampo,
  useAgronmosList,
  useAssignAgronomoToCampo,
  type Campo,
} from './hooks/useCampos';
import { CreateCampoModal } from './CreateCampoModal';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const { Title } = Typography;

export function CamposPage() {
  const { user } = useAuth();
  const camposQuery = useCampos();
  const deleteMutation = useDeleteCampo();
  const agronoms = useAgronmosList();
  const assignMutation = useAssignAgronomoToCampo();
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = user?.role === Role.ADMIN || user?.role === Role.PRODUCTOR;
  const canDelete = user?.role === Role.ADMIN;

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      notification.success({ message: 'Campo eliminado' });
    } catch {
      notification.error({ message: 'Error al eliminar campo' });
    }
  }

  const columns: ColumnsType<Campo> = [
    { title: 'Código', dataIndex: 'codigo_campo', key: 'codigo_campo' },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Productor ID',
      dataIndex: 'productor_id',
      key: 'productor_id',
      ellipsis: true,
    },
    {
      title: 'Alta',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
    },
    ...(canDelete
      ? [
          {
            title: 'Agrónomo',
            key: 'agronomo',
            render: (_: unknown, record: Campo) => {
              const assigned = agronoms.data?.find((a) =>
                a.campos_asignados.includes(record._id),
              );
              return (
                <Select
                  size="small"
                  style={{ minWidth: 160 }}
                  value={assigned?.id ?? null}
                  loading={agronoms.isLoading || assignMutation.isPending}
                  allowClear
                  placeholder="Sin asignar"
                  onChange={(val: string | null) => {
                    assignMutation.mutate({
                      campoId: record._id,
                      newAgronomoId: val ?? null,
                      agronoms: agronoms.data ?? [],
                    });
                  }}
                  options={(agronoms.data ?? []).map((a) => ({
                    value: a.id,
                    label: a.email,
                  }))}
                  onClick={(e) => e.stopPropagation()}
                />
              );
            },
          } as ColumnsType<Campo>[number],
          {
            title: 'Acciones',
            key: 'actions',
            render: (_: unknown, record: Campo) => (
              <Popconfirm
                title="¿Eliminar este campo?"
                onConfirm={() => handleDelete(record._id)}
                okText="Sí"
                cancelText="No"
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={
                    deleteMutation.isPending &&
                    deleteMutation.variables === record._id
                  }
                />
              </Popconfirm>
            ),
          } as ColumnsType<Campo>[number],
        ]
      : []),
  ];

  return (
    <div>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Campos / Huertas
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Nuevo Campo
          </Button>
        )}
      </Space>

      <Table
        rowKey="_id"
        dataSource={camposQuery.data ?? []}
        columns={columns}
        loading={camposQuery.isLoading}
        pagination={{ pageSize: 20 }}
      />

      <CreateCampoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/campos/hooks/useCampos.ts zarza-web/src/campos/CamposPage.tsx
git commit -m "feat(campos): add Agronomo assignment column in CamposPage for ADMIN"
```

---

## Task 6: AnalisisPage — estado enum, botones Validar/Rechazar, tab Rechazados

**Files:**
- Modify: `zarza-web/src/analisis/types.ts`
- Modify: `zarza-web/src/analisis/useAnalisis.ts`
- Modify: `zarza-web/src/analisis/AnalisisDetailModal.tsx`
- Modify: `zarza-web/src/analisis/AnalisisPage.tsx`

- [ ] **Step 1: Actualizar tipos en `types.ts`**

Reemplazar `zarza-web/src/analisis/types.ts` completo:

```ts
export interface CronogramaEtapa {
  etapa: string;
  cantidad: number;
  prediccion?: {
    cambio_a: string;
    en_dias: number;
    dias_para_cosecha: number;
  };
}

export interface CronogramaCorregido {
  etapa: string;
  cantidad: number;
}

export interface ValidacionExperto {
  fue_corregido: boolean;
  estado?: 'pendiente' | 'validado' | 'rechazado';
  corregido_por?: string;
  fecha_correccion?: string;
  fecha_validacion?: string;
  diagnostico_original?: string;
  cronograma_corregido?: CronogramaCorregido[];
  observaciones?: string;
}

export interface MetricasSalud {
  total_elementos_detectados: number;
  elementos_sanos: number;
  elementos_enfermos: number;
  porcentaje_merma_general: number;
}

export interface Analysis {
  _id: string;
  image_id?: string;
  storage_key?: string;
  campo_id?: string;
  productor_id?: string;
  fecha_analisis?: string;
  metricas_salud?: MetricasSalud;
  cronograma_fenologico: CronogramaEtapa[];
  validacion_experto?: ValidacionExperto;
}

export interface AnalisisListResponse {
  data: Analysis[];
  total: number;
  page: number;
  limit: number;
}

export type EstadoValidacion = 'pendiente' | 'validado' | 'rechazado' | 'all';

export interface ValidateAnalisisPayload {
  action: 'validado' | 'rechazado';
  cronograma_corregido?: CronogramaCorregido[];
  observaciones?: string;
}
```

- [ ] **Step 2: Actualizar `useAnalisis.ts`**

Reemplazar `zarza-web/src/analisis/useAnalisis.ts` completo:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type {
  Analysis,
  AnalisisListResponse,
  EstadoValidacion,
  ValidateAnalisisPayload,
} from './types';

export function useAnalisisList(estado: EstadoValidacion, page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    estado,
  });

  return useQuery<AnalisisListResponse>({
    queryKey: ['analisis', estado, page, limit],
    queryFn: () =>
      apiClient
        .get<AnalisisListResponse>(`/analyses?${params.toString()}`)
        .then((r) => r.data),
  });
}

export function useAnalisisDetail(id: string | null) {
  return useQuery<Analysis>({
    queryKey: ['analisis', id],
    queryFn: () =>
      apiClient.get<Analysis>(`/analyses/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAnalisisImage(id: string | null) {
  return useQuery<{ url: string }>({
    queryKey: ['analisis-image', id],
    queryFn: () =>
      apiClient
        .get<{ url: string }>(`/analyses/${id}/image`)
        .then((r) => r.data),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useValidateAnalisis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ValidateAnalisisPayload }) =>
      apiClient
        .patch<Analysis>(`/analyses/${id}/validate`, payload)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analisis'] }),
  });
}
```

- [ ] **Step 3: Actualizar `AnalisisDetailModal.tsx` — pasar `action: 'rechazado'`**

En `zarza-web/src/analisis/AnalisisDetailModal.tsx`, localizar la función `onFinish` (líneas ~70-85) y cambiar la llamada a `validateMutation.mutateAsync`:

```ts
// Reemplazar la llamada en onFinish:
await validateMutation.mutateAsync({
  id: analysisId,
  payload: {
    action: 'rechazado',
    cronograma_corregido,
    observaciones: values.observaciones,
  },
});
```

También actualizar el import del tipo si es necesario:
```ts
// El import de ValidateAnalisisPayload ya no es necesario aquí (lo usa useAnalisis internamente)
// Solo asegurarse que el payload tiene `action: 'rechazado'`
```

- [ ] **Step 4: Reemplazar `AnalisisPage.tsx`**

Reemplazar `zarza-web/src/analisis/AnalisisPage.tsx` completo:

```tsx
import { useState } from 'react';
import { Button, Space, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAnalisisList, useValidateAnalisis } from './useAnalisis';
import { AnalisisDetailModal } from './AnalisisDetailModal';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import type { Analysis, EstadoValidacion } from './types';

const { Title } = Typography;

const ESTADO_TAG: Record<string, { color: string; label: string }> = {
  validado: { color: 'green', label: 'Validado' },
  rechazado: { color: 'red', label: 'Rechazado' },
  pendiente: { color: 'default', label: 'Pendiente' },
};

function AnalisisTab({ estado }: { estado: EstadoValidacion }) {
  const { user } = useAuth();
  const canValidate = user?.role === Role.AGRONOMO || user?.role === Role.ADMIN;
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useAnalisisList(estado, page);
  const validateMutation = useValidateAnalisis();

  const columns: ColumnsType<Analysis> = [
    {
      title: 'Campo ID',
      dataIndex: 'campo_id',
      key: 'campo_id',
      ellipsis: true,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_analisis',
      key: 'fecha_analisis',
      render: (v: string | undefined) =>
        v ? new Date(v).toLocaleDateString('es-MX') : '—',
    },
    {
      title: 'Etapa predominante',
      key: 'etapa',
      render: (_: unknown, record: Analysis) => {
        if (!record.cronograma_fenologico?.length) return '—';
        const top = [...record.cronograma_fenologico].sort(
          (a, b) => b.cantidad - a.cantidad,
        )[0];
        return top.etapa;
      },
    },
    {
      title: 'Total detectados',
      key: 'total',
      render: (_: unknown, record: Analysis) =>
        record.metricas_salud?.total_elementos_detectados ?? '—',
    },
    {
      title: 'Validación',
      key: 'validacion',
      render: (_: unknown, record: Analysis) => {
        const est = record.validacion_experto?.estado ?? 'pendiente';
        const tag = ESTADO_TAG[est] ?? ESTADO_TAG['pendiente'];
        if (est !== 'pendiente' || !canValidate) {
          return <Tag color={tag.color}>{tag.label}</Tag>;
        }
        return (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            <Tag color="default">Pendiente</Tag>
            <Button
              size="small"
              type="primary"
              loading={
                validateMutation.isPending &&
                (validateMutation.variables as any)?.id === record._id
              }
              onClick={() =>
                validateMutation.mutate({
                  id: record._id,
                  payload: { action: 'validado' },
                })
              }
            >
              Validar
            </Button>
            <Button
              size="small"
              danger
              onClick={() => setSelectedId(record._id)}
            >
              Rechazar
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Table
        rowKey="_id"
        dataSource={query.data?.data ?? []}
        columns={columns}
        loading={query.isLoading}
        onRow={(record) => ({ onClick: () => setSelectedId(record._id) })}
        style={{ cursor: 'pointer' }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />
      <AnalisisDetailModal
        analysisId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}

export function AnalisisPage() {
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
    </div>
  );
}
```

- [ ] **Step 5: Verificar tipos TypeScript**

```bash
cd zarza-web && npx tsc --noEmit
```

Expected: no errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add zarza-web/src/analisis/
git commit -m "feat(analisis): add estado badge, quick Validar/Rechazar buttons, tab Rechazados"
```

---

## Task 7: WebSocket — Notificación al Productor

**Files:**
- Modify: `zarza-web/vite.config.ts`
- Create: `zarza-web/src/shared/useWebSocket.ts`
- Modify: `zarza-web/src/shared/AppShell.tsx`

- [ ] **Step 1: Añadir proxy `/ws` en `vite.config.ts`**

En `zarza-web/vite.config.ts`, añadir entrada `'/ws'` en el objeto `proxy`:

```ts
proxy: {
  '/api': {
    target: env['VITE_API_TARGET'] || 'http://localhost:3001',
    changeOrigin: true,
  },
  '/ws': {
    target: env['VITE_API_TARGET'] || 'http://localhost:3001',
    changeOrigin: true,
    ws: true,
  },
},
```

- [ ] **Step 2: Crear hook `useWebSocket.ts`**

```ts
// zarza-web/src/shared/useWebSocket.ts
import { useEffect, useRef } from 'react';

export function useWebSocket(onMessage: (event: string, data: unknown) => void) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data as string);
        callbackRef.current(event, data);
      } catch {
        // ignorar mensajes mal formados
      }
    };

    return () => ws.close();
  }, []);
}
```

- [ ] **Step 3: Agregar listener en `AppShell.tsx`**

En `zarza-web/src/shared/AppShell.tsx`, añadir el import del hook y el listener dentro de la función `AppShell`:

```ts
// Añadir al bloque de imports al inicio del archivo:
import { useWebSocket } from './useWebSocket';
```

```ts
// Dentro de la función AppShell, después de la línea `const { user, logout } = useAuth();`:
useWebSocket((event, data) => {
  if (event === 'analysis_validated' && user?.role === Role.PRODUCTOR) {
    const d = data as { action: string; validatedBy?: string };
    if (d.action === 'validado') {
      notification.success({
        message: 'Análisis validado',
        description: `El agrónomo ${d.validatedBy ?? 'desconocido'} validó el análisis.`,
      });
    } else {
      notification.warning({
        message: 'Análisis rechazado',
        description: `El agrónomo ${d.validatedBy ?? 'desconocido'} rechazó el análisis.`,
      });
    }
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add zarza-web/vite.config.ts zarza-web/src/shared/useWebSocket.ts zarza-web/src/shared/AppShell.tsx
git commit -m "feat(ws): add WebSocket listener in AppShell, notify PRODUCTOR on analysis_validated"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Fix 403 → Task 1 ✓
  - Campo-Agrónomo assignment (backend scope) → Task 4 ✓
  - Campo-Agrónomo assignment (frontend CamposPage) → Task 5 ✓
  - Assignment desde UserDrawer → ya existía, no requiere cambios ✓
  - Schema `estado` → Task 2 ✓
  - Validate endpoint con `action`, `ADMIN` role, WebSocket → Task 3 ✓
  - AnalisisPage UI (badge, botones, tabs) → Task 6 ✓
  - WebSocket PRODUCTOR notification → Task 7 ✓

- [x] **Placeholders:** Ninguno — todos los pasos tienen código completo.

- [x] **Type consistency:**
  - `EstadoValidacion` definido en `types.ts`, usado en `useAnalisis.ts` y `AnalisisPage.tsx`
  - `ValidateAnalisisPayload` tiene `action` en todos los usos
  - `estado` es `'pendiente' | 'validado' | 'rechazado'` consistentemente en schema, service, y frontend
  - `AnalisisDetailModal` pasa `action: 'rechazado'` al validar

- [x] **Orden correcto:** Tasks 2 → 3 (schema antes que service). Tasks 1, 4, 5, 6, 7 son independientes entre sí.
