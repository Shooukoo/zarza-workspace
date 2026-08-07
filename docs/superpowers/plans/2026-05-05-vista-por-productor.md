# Vista por Productor — Privacidad de datos entre productores — Implementation Plan

**Spec relacionado:** [[2026-05-05-vista-por-productor-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce role-based data scoping on `GET /fruits`, `GET /fruits/:id`, `GET /analyses`, and `GET /analyses/:id` so PRODUCTORs see only their own data, MONITORs see only data from their `campos_asignados`, and ADMIN/AGRONOMO retain full access.

**Architecture:** A `UserScope` type is built in each controller from the JWT payload (plus a `findById` DB call for MONITORs). The scope is passed to the service layer which applies filters before querying MongoDB (analyses) or forwarding to fruit-ms via RabbitMQ (fruits). fruit-ms is extended to apply `productorId` and `campoIds` filters in its Mongoose repository. zarza-web opens `/analisis` to PRODUCTOR and hides the validate UI for that role.

**Tech Stack:** NestJS 11 + Fastify, Mongoose, RabbitMQ / NestJS Microservices, React + Ant Design, TypeScript

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `fruit-backend/src/auth/ports/user-repository.port.ts` | Modify | Add `UserCampos` type and `findById` to interface |
| `fruit-backend/src/auth/infrastructure/repositories/mongoose-user.repository.ts` | Modify | Implement `findById` |
| `fruit-backend/src/auth/domain/types/user-scope.type.ts` | Create | `UserScope` type shared across controllers |
| `fruit-backend/src/auth/infrastructure/auth.module.ts` | Modify | Export `I_USER_REPOSITORY` |
| `fruit-backend/src/fruits-query/fruits-query.controller.ts` | Modify | `buildScope`, inject repo, scope-aware handlers |
| `fruit-backend/src/fruits-query/fruits-query.service.ts` | Modify | Accept `UserScope`, build scoped RMQ payload |
| `fruit-backend/src/fruits-query/fruits-query.controller.spec.ts` | Create | Unit tests for scope enforcement |
| `fruit-ms/src/fruits/ports/analysis-repository.port.ts` | Modify | Extend `FindAllFilter` with `productorId`, `campoIds` |
| `fruit-ms/src/fruits/infrastructure/mongoose-analysis.repository.ts` | Modify | Apply new filters in `findAll` |
| `fruit-ms/src/fruits/fruits.service.ts` | Modify | Pass scope filters through |
| `fruit-ms/src/fruits/fruits.controller.ts` | Modify | Accept scope in `get_fruits`; ownership check in `get_fruit_by_id` |
| `fruit-ms/src/fruits/fruits.controller.spec.ts` | Create | Unit tests for scope filtering |
| `fruit-backend/src/analyses/analyses.controller.ts` | Modify | Add PRODUCTOR role, `buildScope`, ownership check |
| `fruit-backend/src/analyses/analyses.service.ts` | Modify | Accept `UserScope` in `findAll`, apply `productor_id` filter |
| `fruit-backend/src/analyses/analyses.controller.spec.ts` | Create | Unit tests |
| `zarza-web/src/App.tsx` | Modify | Add `Role.PRODUCTOR` to `/analisis` route |
| `zarza-web/src/shared/AppShell.tsx` | Modify | Add `/analisis` nav item for PRODUCTOR |
| `zarza-web/src/analisis/AnalisisDetailModal.tsx` | Modify | Hide validate UI for PRODUCTOR |

---

## Task 1: Extend IUserRepository with findById + create UserScope type + export from AuthModule

**Files:**
- Modify: `fruit-backend/src/auth/ports/user-repository.port.ts`
- Modify: `fruit-backend/src/auth/infrastructure/repositories/mongoose-user.repository.ts`
- Create: `fruit-backend/src/auth/domain/types/user-scope.type.ts`
- Modify: `fruit-backend/src/auth/infrastructure/auth.module.ts`

- [ ] **Step 1: Read current auth.module.ts and mongoose-user.repository.ts**

```bash
cat fruit-backend/src/auth/infrastructure/auth.module.ts
cat fruit-backend/src/auth/infrastructure/repositories/mongoose-user.repository.ts
```

Note the current `exports` array in AuthModule and the constructor/methods of MongooseUserRepository.

- [ ] **Step 2: Add UserCampos type and findById to IUserRepository**

Replace `fruit-backend/src/auth/ports/user-repository.port.ts`:

```typescript
import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';

export const I_USER_REPOSITORY = Symbol('I_USER_REPOSITORY');

export type CreateUserData = {
  email: string;
  passwordHash: string;
  role: Role;
};

export type UserCampos = {
  id: string;
  camposAsignados: string[];
};

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<UserCampos | null>;
}
```

- [ ] **Step 3: Implement findById in MongooseUserRepository**

Add the following method to the `MongooseUserRepository` class. Add `Types` to the `mongoose` import if not already present:

```typescript
async findById(id: string): Promise<UserCampos | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await this.userModel
    .findById(id)
    .select('campos_asignados')
    .lean<{ campos_asignados: Types.ObjectId[] }>()
    .exec();
  if (!doc) return null;
  return {
    id,
    camposAsignados: doc.campos_asignados?.map((oid) => oid.toString()) ?? [],
  };
}
```

- [ ] **Step 4: Create UserScope type**

Create `fruit-backend/src/auth/domain/types/user-scope.type.ts`:

```typescript
import { Role } from '../enums/role.enum';

export type UserScope = {
  role: Role;
  sub: string;
  camposAsignados?: string[];
};
```

- [ ] **Step 5: Export I_USER_REPOSITORY from AuthModule**

In `fruit-backend/src/auth/infrastructure/auth.module.ts`, add `I_USER_REPOSITORY` to the `exports` array if not already present:

```typescript
exports: [
  I_USER_REPOSITORY,  // ← add if missing
  I_TOKEN_PORT,
  I_HASHER_PORT,
  // ... keep existing exports
],
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd fruit-backend && pnpm run build 2>&1 | head -30
```

Expected: no errors related to the new method or type.

- [ ] **Step 7: Commit**

```bash
git add fruit-backend/src/auth/ports/user-repository.port.ts \
        fruit-backend/src/auth/infrastructure/repositories/mongoose-user.repository.ts \
        fruit-backend/src/auth/domain/types/user-scope.type.ts \
        fruit-backend/src/auth/infrastructure/auth.module.ts
git commit -m "feat(auth): add UserScope type, findById to IUserRepository, export from AuthModule"
```

---

## Task 2: Scope enforcement in fruits-query (fruit-backend)

**Files:**
- Modify: `fruit-backend/src/fruits-query/fruits-query.controller.ts`
- Modify: `fruit-backend/src/fruits-query/fruits-query.service.ts`
- Create: `fruit-backend/src/fruits-query/fruits-query.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `fruit-backend/src/fruits-query/fruits-query.controller.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FruitsQueryController } from './fruits-query.controller';
import { FruitsQueryService } from './fruits-query.service';
import { I_USER_REPOSITORY } from '../auth/ports/user-repository.port';
import { Role } from '../auth/domain/enums/role.enum';

describe('FruitsQueryController — scope enforcement', () => {
  let controller: FruitsQueryController;
  let service: { findAll: jest.Mock; findOne: jest.Mock };
  let userRepo: { findById: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn(), findOne: jest.fn() };
    userRepo = { findById: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [FruitsQueryController],
      providers: [
        { provide: FruitsQueryService, useValue: service },
        { provide: I_USER_REPOSITORY, useValue: userRepo },
      ],
    }).compile();

    controller = module.get(FruitsQueryController);
  });

  it('PRODUCTOR: passes productor scope to service.findAll', async () => {
    service.findAll.mockResolvedValue([]);
    const req = { user: { sub: 'prod1', role: Role.PRODUCTOR, email: 'p@test.com' } };
    await controller.findAll(req as any, 1, 20);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      { role: Role.PRODUCTOR, sub: 'prod1' },
    );
  });

  it('MONITOR: resolves camposAsignados and passes to service.findAll', async () => {
    service.findAll.mockResolvedValue([]);
    userRepo.findById.mockResolvedValue({ id: 'mon1', camposAsignados: ['c1', 'c2'] });
    const req = { user: { sub: 'mon1', role: Role.MONITOR, email: 'm@test.com' } };
    await controller.findAll(req as any, 1, 20);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      { role: Role.MONITOR, sub: 'mon1', camposAsignados: ['c1', 'c2'] },
    );
  });

  it('ADMIN: passes no scope restriction', async () => {
    service.findAll.mockResolvedValue([]);
    const req = { user: { sub: 'adm1', role: Role.ADMIN, email: 'a@test.com' } };
    await controller.findAll(req as any, 1, 20);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      { role: Role.ADMIN, sub: 'adm1' },
    );
  });

  it('findOne: throws 404 when service returns null', async () => {
    service.findOne.mockResolvedValue(null);
    const req = { user: { sub: 'prod1', role: Role.PRODUCTOR, email: 'p@test.com' } };
    await expect(controller.findOne('some-id', req as any)).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fruit-backend && pnpm run test --testPathPattern="fruits-query.controller.spec" 2>&1 | tail -20
```

Expected: FAIL — `findOne` method not found or wrong signatures.

- [ ] **Step 3: Replace FruitsQueryController**

Replace `fruit-backend/src/fruits-query/fruits-query.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Logger,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Req,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { FruitsQueryService } from './fruits-query.service';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { Role } from '../auth/domain/enums/role.enum';

@Controller('fruits')
@UseGuards(JwtAuthGuard)
export class FruitsQueryController {
  private readonly logger = new Logger(FruitsQueryController.name);

  constructor(
    private readonly fruitsQueryService: FruitsQueryService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('image_id') imageId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const scope = await this.buildScope(req.user);
    this.logger.debug(`GET /fruits page=${page} limit=${limit} role=${scope.role}`);
    return this.fruitsQueryService.findAll({ page, limit, imageId, startDate, endDate }, scope);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const scope = await this.buildScope(req.user);
    const result = await this.fruitsQueryService.findOne(id, scope);
    if (!result) throw new NotFoundException();
    return result;
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
    if (jwtUser.role === Role.MONITOR) {
      const user = await this.userRepository.findById(jwtUser.sub);
      return { role: jwtUser.role, sub: jwtUser.sub, camposAsignados: user?.camposAsignados ?? [] };
    }
    return { role: jwtUser.role, sub: jwtUser.sub };
  }
}
```

- [ ] **Step 4: Replace FruitsQueryService**

Replace `fruit-backend/src/fruits-query/fruits-query.service.ts`:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Role } from '../auth/domain/enums/role.enum';
import { type UserScope } from '../auth/domain/types/user-scope.type';

type FindAllParams = {
  page: number;
  limit: number;
  imageId?: string;
  startDate?: string;
  endDate?: string;
};

@Injectable()
export class FruitsQueryService {
  constructor(
    @Inject('FRUITS_SERVICE')
    private readonly fruitsClient: ClientProxy,
  ) {}

  async findAll(params: FindAllParams, scope: UserScope) {
    const payload: Record<string, unknown> = { ...params };
    if (scope.role === Role.PRODUCTOR) payload.productorId = scope.sub;
    if (scope.role === Role.MONITOR) payload.campoIds = scope.camposAsignados;
    return firstValueFrom(this.fruitsClient.send('get_fruits', payload));
  }

  async findOne(id: string, scope: UserScope) {
    const payload: Record<string, unknown> = { id };
    if (scope.role === Role.PRODUCTOR) payload.productorId = scope.sub;
    if (scope.role === Role.MONITOR) payload.campoIds = scope.camposAsignados;
    return firstValueFrom(this.fruitsClient.send('get_fruit_by_id', payload));
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd fruit-backend && pnpm run test --testPathPattern="fruits-query.controller.spec"
```

Expected: PASS — 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/fruits-query/
git commit -m "feat(fruits-query): enforce role-based scope on GET /fruits and GET /fruits/:id"
```

---

## Task 3: Extend fruit-ms for scope-based filtering

**Files:**
- Modify: `fruit-ms/src/fruits/ports/analysis-repository.port.ts`
- Modify: `fruit-ms/src/fruits/infrastructure/mongoose-analysis.repository.ts` (verify path)
- Modify: `fruit-ms/src/fruits/fruits.service.ts`
- Modify: `fruit-ms/src/fruits/fruits.controller.ts`
- Create: `fruit-ms/src/fruits/fruits.controller.spec.ts`

- [ ] **Step 1: Locate the Mongoose repository implementation**

```bash
find fruit-ms/src -name "*.repository.ts"
```

Open the file that implements `IAnalysisRepository.findAll` and note the query-building pattern.

- [ ] **Step 2: Write the failing test**

Create `fruit-ms/src/fruits/fruits.controller.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { FruitsController } from './fruits.controller';
import { FruitsService } from './fruits.service';

const makeAnalysis = (productorId: string, campoId: string) => ({
  productor_id: { toString: () => productorId },
  campo_id: { toString: () => campoId },
});

describe('FruitsController — scope filtering', () => {
  let controller: FruitsController;
  let service: { findAll: jest.Mock; findById: jest.Mock; process: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn(), findById: jest.fn(), process: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [FruitsController],
      providers: [{ provide: FruitsService, useValue: service }],
    }).compile();
    controller = module.get(FruitsController);
  });

  it('passes productorId to service.findAll', async () => {
    service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
    await controller.getAll({ page: 1, limit: 20, productorId: 'prod1' });
    expect(service.findAll).toHaveBeenCalledWith(
      1, 20, undefined, undefined, undefined, undefined,
      { productorId: 'prod1', campoIds: undefined },
    );
  });

  it('passes campoIds to service.findAll', async () => {
    service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
    await controller.getAll({ page: 1, limit: 20, campoIds: ['c1', 'c2'] });
    expect(service.findAll).toHaveBeenCalledWith(
      1, 20, undefined, undefined, undefined, undefined,
      { productorId: undefined, campoIds: ['c1', 'c2'] },
    );
  });

  it('getById returns null when productorId does not match', async () => {
    service.findById.mockResolvedValue(makeAnalysis('other-prod', 'c1'));
    const result = await controller.getById({ id: 'abc', productorId: 'prod1' });
    expect(result).toBeNull();
  });

  it('getById returns null when campo_id not in campoIds', async () => {
    service.findById.mockResolvedValue(makeAnalysis('prod1', 'c3'));
    const result = await controller.getById({ id: 'abc', campoIds: ['c1', 'c2'] });
    expect(result).toBeNull();
  });

  it('getById returns document when no scope restriction', async () => {
    const doc = makeAnalysis('prod1', 'c1');
    service.findById.mockResolvedValue(doc);
    const result = await controller.getById({ id: 'abc' });
    expect(result).toBe(doc);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd fruit-ms && pnpm run test --testPathPattern="fruits.controller.spec" 2>&1 | tail -20
```

Expected: FAIL.

- [ ] **Step 4: Extend FindAllFilter**

In `fruit-ms/src/fruits/ports/analysis-repository.port.ts`, add two fields to `FindAllFilter`:

```typescript
export type FindAllFilter = {
  imageId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  productorId?: string;
  campoIds?: string[];
};
```

- [ ] **Step 5: Add scope filters to Mongoose repository findAll**

In the Mongoose repository `findAll` implementation, after building the existing filter object, add:

```typescript
if (filter.productorId) {
  query.productor_id = new Types.ObjectId(filter.productorId);
}
if (filter.campoIds?.length) {
  query.campo_id = { $in: filter.campoIds.map((id) => new Types.ObjectId(id)) };
}
```

Make sure `Types` is imported from `mongoose`.

- [ ] **Step 6: Update FruitsService.findAll**

In `fruit-ms/src/fruits/fruits.service.ts`, add the scope parameter to `findAll`:

```typescript
async findAll(
  page: number,
  limit: number,
  imageId?: string,
  userId?: string,
  startDate?: Date,
  endDate?: Date,
  scopeFilter?: { productorId?: string; campoIds?: string[] },
) {
  return this.analysisRepo.findAll(page, limit, {
    imageId,
    userId,
    startDate,
    endDate,
    productorId: scopeFilter?.productorId,
    campoIds: scopeFilter?.campoIds,
  });
}
```

- [ ] **Step 7: Update FruitsController**

Replace the `getAll` and `getById` handlers in `fruit-ms/src/fruits/fruits.controller.ts` (keep `handleNuevaFruta` unchanged):

```typescript
@MessagePattern('get_fruits')
async getAll(
  @Payload() payload: {
    page?: number;
    limit?: number;
    imageId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    productorId?: string;
    campoIds?: string[];
  },
) {
  this.logger.debug(`get_fruits page=${payload.page ?? 1} limit=${payload.limit ?? 20}`);
  const sDate = payload.startDate ? new Date(payload.startDate) : undefined;
  let eDate = payload.endDate ? new Date(payload.endDate) : undefined;
  if (eDate) eDate.setHours(23, 59, 59, 999);

  return this.fruitsService.findAll(
    payload?.page ?? 1,
    payload?.limit ?? 20,
    payload?.imageId,
    payload?.userId,
    sDate,
    eDate,
    { productorId: payload.productorId, campoIds: payload.campoIds },
  );
}

@MessagePattern('get_fruit_by_id')
async getById(
  @Payload() payload: { id: string; productorId?: string; campoIds?: string[] },
) {
  try {
    const analysis = await this.fruitsService.findById(payload.id);
    if (payload.productorId && analysis.productor_id?.toString() !== payload.productorId) {
      return null;
    }
    if (payload.campoIds?.length && !payload.campoIds.includes(analysis.campo_id?.toString())) {
      return null;
    }
    return analysis;
  } catch {
    return null;
  }
}
```

- [ ] **Step 8: Run tests**

```bash
cd fruit-ms && pnpm run test --testPathPattern="fruits.controller.spec"
```

Expected: PASS — 5 tests green.

- [ ] **Step 9: Commit**

```bash
git add fruit-ms/src/fruits/
git commit -m "feat(fruit-ms): support productorId and campoIds scope filters in get_fruits / get_fruit_by_id"
```

---

## Task 4: Scope enforcement in analyses (fruit-backend)

**Files:**
- Modify: `fruit-backend/src/analyses/analyses.controller.ts`
- Modify: `fruit-backend/src/analyses/analyses.service.ts`
- Create: `fruit-backend/src/analyses/analyses.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `fruit-backend/src/analyses/analyses.controller.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { I_USER_REPOSITORY } from '../auth/ports/user-repository.port';
import { Role } from '../auth/domain/enums/role.enum';

describe('AnalysesController — scope enforcement', () => {
  let controller: AnalysesController;
  let service: { findAll: jest.Mock; findById: jest.Mock; getImageUrl: jest.Mock; validate: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn(), findById: jest.fn(), getImageUrl: jest.fn(), validate: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [AnalysesController],
      providers: [
        { provide: AnalysesService, useValue: service },
        { provide: I_USER_REPOSITORY, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AnalysesController);
  });

  it('PRODUCTOR: passes scope to service.findAll', async () => {
    service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
    const req = { user: { sub: 'prod1', role: Role.PRODUCTOR, email: 'p@test.com' } };
    await controller.findAll(req as any, 1, 20);
    expect(service.findAll).toHaveBeenCalledWith(
      1, 20, false,
      { role: Role.PRODUCTOR, sub: 'prod1' },
    );
  });

  it('AGRONOMO: passes no scope restriction', async () => {
    service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
    const req = { user: { sub: 'agro1', role: Role.AGRONOMO, email: 'a@test.com' } };
    await controller.findAll(req as any, 1, 20);
    expect(service.findAll).toHaveBeenCalledWith(
      1, 20, false,
      { role: Role.AGRONOMO, sub: 'agro1' },
    );
  });

  it('PRODUCTOR: findOne throws 404 for unowned analysis', async () => {
    const otherId = new Types.ObjectId();
    service.findById.mockResolvedValue({
      productor_id: { toString: () => otherId.toString() },
    });
    const req = { user: { sub: new Types.ObjectId().toString(), role: Role.PRODUCTOR, email: 'p@test.com' } };
    await expect(controller.findOne('abc', req as any)).rejects.toThrow(NotFoundException);
  });

  it('PRODUCTOR: findOne returns analysis when it belongs to them', async () => {
    const prodId = new Types.ObjectId().toString();
    const doc = { productor_id: { toString: () => prodId } };
    service.findById.mockResolvedValue(doc);
    const req = { user: { sub: prodId, role: Role.PRODUCTOR, email: 'p@test.com' } };
    const result = await controller.findOne('abc', req as any);
    expect(result).toBe(doc);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fruit-backend && pnpm run test --testPathPattern="analyses.controller.spec" 2>&1 | tail -20
```

Expected: FAIL.

- [ ] **Step 3: Update AnalysesService.findAll**

In `fruit-backend/src/analyses/analyses.service.ts`, add the `scope` parameter and `productor_id` filter. Add to imports: `FilterQuery` from `mongoose`, `UserScope` from the new type file, `Role` from enums:

```typescript
import { FilterQuery } from 'mongoose';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { Role } from '../auth/domain/enums/role.enum';
```

Replace the `findAll` method:

```typescript
async findAll(
  page: number,
  limit: number,
  validado: boolean | 'all',
  scope: UserScope,
): Promise<{ data: AnalysisDocument[]; total: number; page: number; limit: number }> {
  const skip = (page - 1) * limit;
  const query: FilterQuery<AnalysisDocument> =
    validado === 'all' ? {} : { 'validacion_experto.fue_corregido': validado };

  if (scope.role === Role.PRODUCTOR) {
    query.productor_id = new Types.ObjectId(scope.sub);
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

- [ ] **Step 4: Replace AnalysesController**

Replace `fruit-backend/src/analyses/analyses.controller.ts`:

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

@Controller('analyses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalysesController {
  constructor(
    private readonly analysesService: AnalysesService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('validado') validadoParam?: string,
  ) {
    let validado: boolean | 'all' = false;
    if (validadoParam === 'true') validado = true;
    else if (validadoParam === 'all') validado = 'all';
    else if (validadoParam !== undefined && validadoParam !== 'false') {
      throw new BadRequestException('validado must be true, false, or all');
    }
    const scope = await this.buildScope(req.user);
    return this.analysesService.findAll(page, limit, validado, scope);
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
  @Roles(Role.AGRONOMO)
  validate(
    @Param('id') id: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: ValidateAnalysisDto,
  ) {
    return this.analysesService.validate(id, req.user.sub, dto);
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
    return { role: jwtUser.role, sub: jwtUser.sub };
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd fruit-backend && pnpm run test --testPathPattern="analyses.controller.spec"
```

Expected: PASS — 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/analyses/
git commit -m "feat(analyses): enforce PRODUCTOR scope on GET /analyses and GET /analyses/:id"
```

---

## Task 5: zarza-web — route, sidebar, hide validate UI

**Files:**
- Modify: `zarza-web/src/App.tsx`
- Modify: `zarza-web/src/shared/AppShell.tsx`
- Modify: `zarza-web/src/analisis/AnalisisDetailModal.tsx`

- [ ] **Step 1: Read AppShell.tsx and AnalisisDetailModal.tsx**

```bash
cat zarza-web/src/shared/AppShell.tsx
cat zarza-web/src/analisis/AnalisisDetailModal.tsx
```

In AppShell, locate the nav items array (usually an array of objects with `key`, `label`, `icon`, and a `roles` or similar condition). In AnalisisDetailModal, locate the section that renders the validate form or button.

- [ ] **Step 2: Add PRODUCTOR to /analisis route in App.tsx**

In `zarza-web/src/App.tsx`, find:

```tsx
<Route
  element={
    <PrivateRoute allowedRoles={[Role.ADMIN, Role.AGRONOMO]} />
  }
>
  <Route path="/analisis" element={<AnalisisPage />} />
</Route>
```

Replace with:

```tsx
<Route
  element={
    <PrivateRoute allowedRoles={[Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR]} />
  }
>
  <Route path="/analisis" element={<AnalisisPage />} />
</Route>
```

- [ ] **Step 3: Add /analisis sidebar nav item for PRODUCTOR in AppShell**

In `zarza-web/src/shared/AppShell.tsx`, find the nav item for `/analisis`. Add `Role.PRODUCTOR` to its allowed roles condition. The exact change depends on the nav item structure found in Step 1. Common patterns:

**If roles are an array:**
```tsx
{ key: '/analisis', ..., roles: [Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR] }
```

**If rendered conditionally:**
```tsx
{[Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR].includes(user.role) && (
  <Menu.Item key="/analisis">...</Menu.Item>
)}
```

Match whatever pattern AppShell uses.

- [ ] **Step 4: Hide validate UI for PRODUCTOR in AnalisisDetailModal**

In `zarza-web/src/analisis/AnalisisDetailModal.tsx`:

1. Add `useAuthContext` import if not present:
```tsx
import { useAuthContext } from '../auth/AuthContext';
```

2. Inside the component function, get the user:
```tsx
const { user } = useAuthContext();
```

3. Find the validate button or form section (identified in Step 1). Wrap it:
```tsx
{user?.role !== 'PRODUCTOR' && (
  /* existing validate JSX here */
)}
```

- [ ] **Step 5: Manual test**

```bash
cd zarza-web && pnpm run dev
```

Test the following scenarios:

1. **PRODUCTOR login** → `/analisis` loads → table shows only their analyses (confirm by checking `productor_id` values match their user ID) → no validate button visible
2. **AGRONOMO login** → `/analisis` loads → all analyses visible → validate button visible
3. **MONITOR login** → `/analisis` redirects to `/403` (route not in allowedRoles for MONITOR)
4. **ADMIN login** → `/analisis` loads → all analyses visible → validate button visible

- [ ] **Step 6: Commit**

```bash
git add zarza-web/src/App.tsx zarza-web/src/shared/AppShell.tsx zarza-web/src/analisis/AnalisisDetailModal.tsx
git commit -m "feat(zarza-web): open /analisis to PRODUCTOR with scoped view, hide validate UI for PRODUCTOR"
```
