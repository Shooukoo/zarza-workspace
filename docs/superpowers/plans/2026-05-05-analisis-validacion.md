# Análisis Validation Implementation Plan

**Spec relacionado:** [[2026-05-05-analisis-validacion-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users with role AGRONOMO to review AI-generated analyses, correct phenological stage counts and add observations, and save the correction with `fue_corregido: true`.

**Architecture:** New `analyses/` module in `fruit-backend` reads and writes directly to the `analyses` MongoDB collection (same approach as `admin/` module). The `storage/` module gets a `getPresignedUrl()` method to serve temporary R2 image URLs. In `zarza-web` a new `/analisis` page follows the exact pattern of the `solicitudes/` module.

**Tech Stack:** NestJS 11 + Mongoose + Fastify (backend); React 18 + Ant Design 5 + TanStack React Query 5 + Axios (frontend); `@aws-sdk/s3-request-presigner` for presigned URLs.

---

## File Map

### fruit-backend — created
- `src/analyses/analyses.schema.ts` — full Mongoose schema for `analyses` collection
- `src/analyses/dto/validate-analysis.dto.ts` — DTO for PATCH body
- `src/analyses/analyses.service.ts` — service: list, findById, image URL, validate
- `src/analyses/analyses.controller.ts` — controller: GET /analyses, GET /analyses/:id, GET /analyses/:id/image, PATCH /analyses/:id/validate
- `src/analyses/analyses.module.ts` — NestJS module wiring

### fruit-backend — modified
- `src/storage/ports/storage.port.ts` — add `getPresignedUrl()` to interface
- `src/storage/storage.service.ts` — implement `getPresignedUrl()` using `@aws-sdk/s3-request-presigner`
- `src/app.module.ts` — import `AnalysesModule`

### zarza-web — created
- `src/analisis/types.ts` — TypeScript interfaces
- `src/analisis/useAnalisis.ts` — React Query hooks
- `src/analisis/AnalisisPage.tsx` — table with Pendientes / Validados tabs
- `src/analisis/AnalisisDetailModal.tsx` — detail modal with image, AI data, correction form

### zarza-web — modified
- `src/App.tsx` — add `/analisis` route for ADMIN and AGRONOMO
- `src/shared/AppShell.tsx` — add sidebar link for ADMIN and AGRONOMO

---

## Task 1: Add `getPresignedUrl` to StorageService

**Files:**
- Modify: `fruit-backend/src/storage/ports/storage.port.ts`
- Modify: `fruit-backend/src/storage/storage.service.ts`

- [ ] **Step 1.1: Install `@aws-sdk/s3-request-presigner`**

From inside `fruit-backend/`:
```bash
cd fruit-backend
pnpm add @aws-sdk/s3-request-presigner
```

Expected output: package added to `dependencies`.

- [ ] **Step 1.2: Write the failing unit test**

Create `fruit-backend/src/storage/storage.service.spec.ts`:
```typescript
import { StorageService } from './storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://r2.example.com/raw/test.jpg?signed=1'),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  GetObjectCommand: jest.fn().mockImplementation((params) => ({ params })),
}));

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn(),
}));

// Stub envs before StorageService is instantiated
jest.mock('../config/envs', () => ({
  envs: {
    r2BucketName: 'test-bucket',
    r2Endpoint: 'https://endpoint.r2.cloudflarestorage.com',
    r2AccessKeyId: 'key',
    r2SecretAccessKey: 'secret',
  },
}));

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService();
  });

  it('getPresignedUrl returns a signed URL string', async () => {
    const url = await service.getPresignedUrl('raw/test.jpg', 900);
    expect(typeof url).toBe('string');
    expect(url).toContain('https://');
  });
});
```

- [ ] **Step 1.3: Run to confirm it fails**

```bash
cd fruit-backend
pnpm test --testPathPattern=storage.service.spec
```

Expected: FAIL — `getPresignedUrl is not a function`.

- [ ] **Step 1.4: Update `IStoragePort` to include `getPresignedUrl`**

Replace the contents of `fruit-backend/src/storage/ports/storage.port.ts`:
```typescript
export const STORAGE_PORT = 'STORAGE_PORT';

export interface IStoragePort {
  uploadBuffer(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  getPresignedUrl(key: string, expiresIn: number): Promise<string>;
}
```

- [ ] **Step 1.5: Implement `getPresignedUrl` in `StorageService`**

Replace the full contents of `fruit-backend/src/storage/storage.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { envs } from '../config/envs';
import type { IStoragePort } from './ports';

@Injectable()
export class StorageService implements IStoragePort {
  private s3Client: S3Client;
  private bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor() {
    this.bucketName = envs.r2BucketName;
    this.s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: envs.r2Endpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: envs.r2AccessKeyId,
        secretAccessKey: envs.r2SecretAccessKey,
      },
    });
  }

  async uploadBuffer(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `raw/${Date.now()}-${safeFilename}`;
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ContentLength: buffer.length,
        },
      });
      this.logger.log(`Starting upload for ${key} (${buffer.length} bytes)`);
      await upload.done();
      this.logger.log(`Upload completed for ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Upload failed for ${key}`, error);
      throw error;
    }
  }

  async getPresignedUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
```

- [ ] **Step 1.6: Run test to confirm it passes**

```bash
cd fruit-backend
pnpm test --testPathPattern=storage.service.spec
```

Expected: PASS.

- [ ] **Step 1.7: Commit**

```bash
cd fruit-backend
git add src/storage/ports/storage.port.ts src/storage/storage.service.ts src/storage/storage.service.spec.ts package.json pnpm-lock.yaml
git commit -m "feat(storage): add getPresignedUrl method using s3-request-presigner"
```

---

## Task 2: Create the `analyses` schema

**Files:**
- Create: `fruit-backend/src/analyses/analyses.schema.ts`

- [ ] **Step 2.1: Create the schema file**

Create `fruit-backend/src/analyses/analyses.schema.ts`:
```typescript
import { Schema, SchemaTypes, Types, HydratedDocument } from 'mongoose';

const CronogramaEtapaSchema = new Schema(
  {
    etapa: { type: String },
    cantidad: { type: Number },
    prediccion: {
      cambio_a: { type: String },
      en_dias: { type: Number },
      dias_para_cosecha: { type: Number },
    },
  },
  { _id: false },
);

const CronogramaCorregidoSchema = new Schema(
  {
    etapa: { type: String },
    cantidad: { type: Number },
  },
  { _id: false },
);

export const AnalysisSchema = new Schema(
  {
    image_id: { type: String },
    storage_key: { type: String },
    campo_id: { type: SchemaTypes.ObjectId },
    productor_id: { type: SchemaTypes.ObjectId },
    offline_sync_id: { type: String },
    fecha_analisis: { type: Date },
    metricas_salud: {
      total_elementos_detectados: { type: Number },
      elementos_sanos: { type: Number },
      elementos_enfermos: { type: Number },
      porcentaje_merma_general: { type: Number },
    },
    cronograma_fenologico: [CronogramaEtapaSchema],
    ubicacion_gps: {
      type: { type: String },
      coordinates: { type: [Number] },
    },
    validacion_experto: {
      fue_corregido: { type: Boolean, default: false },
      corregido_por: { type: SchemaTypes.ObjectId, ref: 'User' },
      fecha_correccion: { type: Date },
      diagnostico_original: { type: String },
      cronograma_corregido: [CronogramaCorregidoSchema],
      observaciones: { type: String },
    },
  },
  { collection: 'analyses' },
);

/** Token de clase para MongooseModule.forFeature */
export class Analysis {}

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
  corregido_por?: Types.ObjectId;
  fecha_correccion?: Date;
  diagnostico_original?: string;
  cronograma_corregido?: CronogramaCorregido[];
  observaciones?: string;
}

export interface AnalysisDocument {
  _id: Types.ObjectId;
  image_id?: string;
  storage_key?: string;
  campo_id?: Types.ObjectId;
  productor_id?: Types.ObjectId;
  offline_sync_id?: string;
  fecha_analisis?: Date;
  metricas_salud?: {
    total_elementos_detectados: number;
    elementos_sanos: number;
    elementos_enfermos: number;
    porcentaje_merma_general: number;
  };
  cronograma_fenologico: CronogramaEtapa[];
  ubicacion_gps?: { type: string; coordinates: number[] };
  validacion_experto?: ValidacionExperto;
}

export type AnalysisHydratedDocument = HydratedDocument<AnalysisDocument>;
```

- [ ] **Step 2.2: Commit**

```bash
cd fruit-backend
git add src/analyses/analyses.schema.ts
git commit -m "feat(analyses): add full Mongoose schema for analyses collection"
```

---

## Task 3: Create the `ValidateAnalysisDto`

**Files:**
- Create: `fruit-backend/src/analyses/dto/validate-analysis.dto.ts`

- [ ] **Step 3.1: Write the failing test**

Create `fruit-backend/src/analyses/dto/validate-analysis.dto.spec.ts`:
```typescript
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidateAnalysisDto, CronogramaCorregidoItemDto } from './validate-analysis.dto';

describe('ValidateAnalysisDto', () => {
  it('passes with valid data', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      cronograma_corregido: [{ etapa: 'Madurez', cantidad: 5 }],
      observaciones: 'El fruto está más maduro de lo detectado',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when cronograma_corregido is empty array', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      cronograma_corregido: [],
      observaciones: 'Observacion',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'cronograma_corregido')).toBe(true);
  });

  it('fails when observaciones is missing', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      cronograma_corregido: [{ etapa: 'Madurez', cantidad: 3 }],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'observaciones')).toBe(true);
  });

  it('fails when observaciones is empty string', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      cronograma_corregido: [{ etapa: 'Madurez', cantidad: 3 }],
      observaciones: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'observaciones')).toBe(true);
  });
});
```

- [ ] **Step 3.2: Run to confirm it fails**

```bash
cd fruit-backend
pnpm test --testPathPattern=validate-analysis.dto.spec
```

Expected: FAIL — `ValidateAnalysisDto` not found.

- [ ] **Step 3.3: Create the DTO**

Create `fruit-backend/src/analyses/dto/validate-analysis.dto.ts`:
```typescript
import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CronogramaCorregidoItemDto {
  @IsString()
  @IsNotEmpty()
  etapa: string;

  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class ValidateAnalysisDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CronogramaCorregidoItemDto)
  cronograma_corregido: CronogramaCorregidoItemDto[];

  @IsString()
  @IsNotEmpty()
  observaciones: string;
}
```

- [ ] **Step 3.4: Run test to confirm it passes**

```bash
cd fruit-backend
pnpm test --testPathPattern=validate-analysis.dto.spec
```

Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
cd fruit-backend
git add src/analyses/dto/validate-analysis.dto.ts src/analyses/dto/validate-analysis.dto.spec.ts
git commit -m "feat(analyses): add ValidateAnalysisDto with class-validator"
```

---

## Task 4: Create `AnalysesService`

**Files:**
- Create: `fruit-backend/src/analyses/analyses.service.ts`

- [ ] **Step 4.1: Write the failing test**

Create `fruit-backend/src/analyses/analyses.service.spec.ts`:
```typescript
import { NotFoundException } from '@nestjs/common';
import { AnalysesService } from './analyses.service';
import { Types } from 'mongoose';

const mockAnalysis = {
  _id: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
  storage_key: 'raw/test.jpg',
  cronograma_fenologico: [{ etapa: 'Verde', cantidad: 10 }],
  validacion_experto: { fue_corregido: false },
};

const mockModel = {
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockAnalysis]),
  }),
  countDocuments: jest.fn().mockResolvedValue(1),
  findById: jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(mockAnalysis),
  }),
  findByIdAndUpdate: jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue({
      ...mockAnalysis,
      validacion_experto: { fue_corregido: true },
    }),
  }),
};

const mockStorage = {
  getPresignedUrl: jest.fn().mockResolvedValue('https://r2.example.com/raw/test.jpg?signed=1'),
};

describe('AnalysesService', () => {
  let service: AnalysesService;

  beforeEach(() => {
    service = new AnalysesService(mockModel as any, mockStorage as any);
  });

  describe('findAll', () => {
    it('returns paginated results with validado=false filter', async () => {
      const result = await service.findAll(1, 20, false);
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(mockModel.find).toHaveBeenCalledWith({ 'validacion_experto.fue_corregido': false });
    });

    it('returns all when validado is "all"', async () => {
      await service.findAll(1, 20, 'all');
      expect(mockModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('findById', () => {
    it('returns the analysis when found', async () => {
      const result = await service.findById('aaaaaaaaaaaaaaaaaaaaaaaa');
      expect(result._id.toString()).toBe('aaaaaaaaaaaaaaaaaaaaaaaa');
    });

    it('throws NotFoundException when not found', async () => {
      mockModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findById('bbbbbbbbbbbbbbbbbbbbbbbb')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getImageUrl', () => {
    it('returns presigned URL', async () => {
      const url = await service.getImageUrl('aaaaaaaaaaaaaaaaaaaaaaaa');
      expect(url).toContain('https://');
      expect(mockStorage.getPresignedUrl).toHaveBeenCalledWith('raw/test.jpg', 900);
    });

    it('throws NotFoundException when analysis not found', async () => {
      mockModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.getImageUrl('bbbbbbbbbbbbbbbbbbbbbbbb')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validate', () => {
    it('saves correction and returns updated analysis', async () => {
      const dto = {
        cronograma_corregido: [{ etapa: 'Madurez', cantidad: 5 }],
        observaciones: 'Corregido por el agrónomo',
      };
      const result = await service.validate('aaaaaaaaaaaaaaaaaaaaaaaa', 'userIdAbc', dto);
      expect(result.validacion_experto.fue_corregido).toBe(true);
    });
  });
});
```

- [ ] **Step 4.2: Run to confirm it fails**

```bash
cd fruit-backend
pnpm test --testPathPattern=analyses.service.spec
```

Expected: FAIL — `AnalysesService` not found.

- [ ] **Step 4.3: Create `AnalysesService`**

Create `fruit-backend/src/analyses/analyses.service.ts`:
```typescript
import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Analysis, AnalysisDocument } from './analyses.schema';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { STORAGE_PORT, type IStoragePort } from '../storage/ports';

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    @InjectModel(Analysis.name)
    private readonly analysisModel: Model<AnalysisDocument>,
    @Inject(STORAGE_PORT)
    private readonly storage: IStoragePort,
  ) {}

  async findAll(
    page: number,
    limit: number,
    validado: boolean | 'all',
  ): Promise<{ data: AnalysisDocument[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const query = validado === 'all' ? {} : { 'validacion_experto.fue_corregido': validado };

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

  async findById(id: string): Promise<AnalysisDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    }
    const analysis = await this.analysisModel
      .findById(id)
      .lean<AnalysisDocument>()
      .exec();

    if (!analysis) {
      throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    }
    return analysis;
  }

  async getImageUrl(id: string): Promise<string> {
    const analysis = await this.findById(id);
    if (!analysis.storage_key) {
      throw new NotFoundException(`El análisis ${id} no tiene imagen asociada`);
    }
    return this.storage.getPresignedUrl(analysis.storage_key, 900);
  }

  async validate(
    id: string,
    corregidoPorId: string,
    dto: ValidateAnalysisDto,
  ): Promise<AnalysisDocument> {
    const existing = await this.findById(id);

    const diagnosticoOriginal =
      existing.validacion_experto?.fue_corregido
        ? existing.validacion_experto.diagnostico_original
        : JSON.stringify(existing.cronograma_fenologico);

    const updated = await this.analysisModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            'validacion_experto.fue_corregido': true,
            'validacion_experto.corregido_por': new Types.ObjectId(corregidoPorId),
            'validacion_experto.fecha_correccion': new Date(),
            'validacion_experto.diagnostico_original': diagnosticoOriginal,
            'validacion_experto.cronograma_corregido': dto.cronograma_corregido,
            'validacion_experto.observaciones': dto.observaciones,
          },
        },
        { new: true },
      )
      .lean<AnalysisDocument>()
      .exec();

    if (!updated) {
      throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    }

    this.logger.log(`Análisis ${id} validado por usuario ${corregidoPorId}`);
    return updated;
  }
}
```

- [ ] **Step 4.4: Run test to confirm it passes**

```bash
cd fruit-backend
pnpm test --testPathPattern=analyses.service.spec
```

Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
cd fruit-backend
git add src/analyses/analyses.service.ts src/analyses/analyses.service.spec.ts
git commit -m "feat(analyses): add AnalysesService with findAll, findById, getImageUrl, validate"
```

---

## Task 5: Create controller, module, and wire in AppModule

**Files:**
- Create: `fruit-backend/src/analyses/analyses.controller.ts`
- Create: `fruit-backend/src/analyses/analyses.module.ts`
- Modify: `fruit-backend/src/app.module.ts`

- [ ] **Step 5.1: Create `AnalysesController`**

Create `fruit-backend/src/analyses/analyses.controller.ts`:
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
} from '@nestjs/common';
import { AnalysesService } from './analyses.service';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';

/**
 * GET    /api/analyses              → Listar análisis paginados (ADMIN, AGRONOMO)
 * GET    /api/analyses/:id          → Detalle de un análisis (ADMIN, AGRONOMO)
 * GET    /api/analyses/:id/image    → Presigned URL de la imagen (ADMIN, AGRONOMO)
 * PATCH  /api/analyses/:id/validate → Guardar corrección (AGRONOMO)
 */
@Controller('analyses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO)
  findAll(
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
    return this.analysesService.findAll(page, limit, validado);
  }

  @Get(':id/image')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async getImage(@Param('id') id: string) {
    const url = await this.analysesService.getImageUrl(id);
    return { url };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  findOne(@Param('id') id: string) {
    return this.analysesService.findById(id);
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
}
```

> **Note:** `GET /:id/image` is declared before `GET /:id` to avoid NestJS matching "image" as an id param.

- [ ] **Step 5.2: Create `AnalysesModule`**

Create `fruit-backend/src/analyses/analyses.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { Analysis, AnalysisSchema } from './analyses.schema';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Analysis.name, schema: AnalysisSchema }]),
    AuthModule,
    StorageModule,
  ],
  controllers: [AnalysesController],
  providers: [AnalysesService],
})
export class AnalysesModule {}
```

- [ ] **Step 5.3: Register `AnalysesModule` in `AppModule`**

In `fruit-backend/src/app.module.ts`, add the import. Replace the imports array:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
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
import { envs } from './config/envs';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(envs.mongoUri),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
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

- [ ] **Step 5.4: Verify the build compiles without errors**

```bash
cd fruit-backend
pnpm run build
```

Expected: build completes with no TypeScript errors. If there are import errors, check that all paths match exactly.

- [ ] **Step 5.5: Commit**

```bash
cd fruit-backend
git add src/analyses/analyses.controller.ts src/analyses/analyses.module.ts src/app.module.ts
git commit -m "feat(analyses): add AnalysesController and AnalysesModule, register in AppModule"
```

---

## Task 6: Create frontend types and hooks

**Files:**
- Create: `zarza-web/src/analisis/types.ts`
- Create: `zarza-web/src/analisis/useAnalisis.ts`

- [ ] **Step 6.1: Create `types.ts`**

Create `zarza-web/src/analisis/types.ts`:
```typescript
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
  corregido_por?: string;
  fecha_correccion?: string;
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

export interface ValidateAnalisisPayload {
  cronograma_corregido: CronogramaCorregido[];
  observaciones: string;
}
```

- [ ] **Step 6.2: Create `useAnalisis.ts`**

Create `zarza-web/src/analisis/useAnalisis.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type {
  Analysis,
  AnalisisListResponse,
  ValidateAnalisisPayload,
} from './types';

export function useAnalisisList(validado: boolean | 'all', page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    validado: validado === 'all' ? 'all' : String(validado),
  });

  return useQuery<AnalisisListResponse>({
    queryKey: ['analisis', validado, page, limit],
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

- [ ] **Step 6.3: Commit**

```bash
cd zarza-web
git add src/analisis/types.ts src/analisis/useAnalisis.ts
git commit -m "feat(zarza-web): add análisis types and React Query hooks"
```

---

## Task 7: Create `AnalisisDetailModal`

**Files:**
- Create: `zarza-web/src/analisis/AnalisisDetailModal.tsx`

- [ ] **Step 7.1: Create the modal component**

Create `zarza-web/src/analisis/AnalisisDetailModal.tsx`:
```tsx
import { useEffect } from 'react';
import {
  Modal,
  Row,
  Col,
  Image,
  Skeleton,
  Descriptions,
  InputNumber,
  Input,
  Form,
  Button,
  Typography,
  Space,
  message,
} from 'antd';
import { useAnalisisDetail, useAnalisisImage, useValidateAnalisis } from './useAnalisis';
import type { CronogramaCorregido } from './types';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const { Text } = Typography;

interface Props {
  analysisId: string | null;
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  etapas: Record<string, number>;
  observaciones: string;
}

export function AnalisisDetailModal({ analysisId, open, onClose }: Props) {
  const { user } = useAuth();
  const isAgronomo = user?.role === Role.AGRONOMO;

  const detailQuery = useAnalisisDetail(analysisId);
  const imageQuery = useAnalisisImage(analysisId);
  const validateMutation = useValidateAnalisis();
  const [form] = Form.useForm<FormValues>();

  const analysis = detailQuery.data;

  // Pre-populate form when analysis loads
  useEffect(() => {
    if (!analysis) return;

    const source =
      analysis.validacion_experto?.cronograma_corregido &&
      analysis.validacion_experto.cronograma_corregido.length > 0
        ? analysis.validacion_experto.cronograma_corregido
        : analysis.cronograma_fenologico;

    const etapas: Record<string, number> = {};
    source.forEach((e) => { etapas[e.etapa] = e.cantidad; });

    form.setFieldsValue({
      etapas,
      observaciones: analysis.validacion_experto?.observaciones ?? '',
    });
  }, [analysis, form]);

  async function onFinish(values: FormValues) {
    if (!analysisId || !analysis) return;

    const cronograma_corregido: CronogramaCorregido[] = analysis.cronograma_fenologico.map(
      (e) => ({ etapa: e.etapa, cantidad: values.etapas[e.etapa] ?? e.cantidad }),
    );

    try {
      await validateMutation.mutateAsync({
        id: analysisId,
        payload: { cronograma_corregido, observaciones: values.observaciones },
      });
      message.success('Corrección guardada exitosamente');
      onClose();
    } catch {
      message.error('Error al guardar la corrección');
    }
  }

  return (
    <Modal
      title="Detalle del Análisis"
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      destroyOnClose
    >
      {detailQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !analysis ? null : (
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={24}>
            {/* LEFT: Photo */}
            <Col xs={24} md={10}>
              {imageQuery.isLoading ? (
                <Skeleton.Image style={{ width: '100%', height: 280 }} active />
              ) : imageQuery.data?.url ? (
                <Image
                  src={imageQuery.data.url}
                  alt="Análisis"
                  style={{ width: '100%', borderRadius: 8 }}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 280,
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                  }}
                >
                  <Text type="secondary">Imagen no disponible</Text>
                </div>
              )}

              {analysis.fecha_analisis && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  Fecha: {new Date(analysis.fecha_analisis).toLocaleDateString('es-MX')}
                </Text>
              )}
            </Col>

            {/* RIGHT: AI data */}
            <Col xs={24} md={14}>
              <Text strong>Métricas del modelo IA</Text>
              {analysis.metricas_salud ? (
                <Descriptions column={2} size="small" style={{ marginTop: 8, marginBottom: 16 }}>
                  <Descriptions.Item label="Total detectados">
                    {analysis.metricas_salud.total_elementos_detectados}
                  </Descriptions.Item>
                  <Descriptions.Item label="Sanos">
                    {analysis.metricas_salud.elementos_sanos}
                  </Descriptions.Item>
                  <Descriptions.Item label="Enfermos">
                    {analysis.metricas_salud.elementos_enfermos}
                  </Descriptions.Item>
                  <Descriptions.Item label="Merma %">
                    {analysis.metricas_salud.porcentaje_merma_general?.toFixed(1)}%
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Text type="secondary">Sin métricas</Text>
              )}

              <Text strong>Cronograma fenológico (modelo IA)</Text>
              <div style={{ marginTop: 8 }}>
                {analysis.cronograma_fenologico.map((e) => (
                  <Space key={e.etapa} style={{ display: 'flex', marginBottom: 4 }}>
                    <Text style={{ minWidth: 120 }}>{e.etapa}:</Text>
                    <Text>{e.cantidad} unidades</Text>
                  </Space>
                ))}
              </div>
            </Col>
          </Row>

          {/* Correction form — always visible but disabled for ADMIN */}
          <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Text strong>
              {isAgronomo ? 'Corrección del diagnóstico' : 'Corrección registrada'}
            </Text>

            <div style={{ marginTop: 12 }}>
              {analysis.cronograma_fenologico.map((e) => (
                <Form.Item
                  key={e.etapa}
                  label={`${e.etapa} — cantidad corregida`}
                  name={['etapas', e.etapa]}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <InputNumber min={0} style={{ width: 120 }} disabled={!isAgronomo} />
                </Form.Item>
              ))}

              <Form.Item
                label="Observaciones"
                name="observaciones"
                rules={[{ required: true, message: 'Ingresa observaciones' }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Describe la corrección realizada..."
                  disabled={!isAgronomo}
                />
              </Form.Item>

              {isAgronomo && (
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={validateMutation.isPending}
                >
                  Guardar corrección
                </Button>
              )}
            </div>
          </div>
        </Form>
      )}
    </Modal>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
cd zarza-web
git add src/analisis/AnalisisDetailModal.tsx
git commit -m "feat(zarza-web): add AnalisisDetailModal with image, AI data, and correction form"
```

---

## Task 8: Create `AnalisisPage`

**Files:**
- Create: `zarza-web/src/analisis/AnalisisPage.tsx`

- [ ] **Step 8.1: Create the page component**

Create `zarza-web/src/analisis/AnalisisPage.tsx`:
```tsx
import { useState } from 'react';
import { Table, Tabs, Typography, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAnalisisList } from './useAnalisis';
import { AnalisisDetailModal } from './AnalisisDetailModal';
import type { Analysis } from './types';

const { Title } = Typography;

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
    title: 'Estado',
    key: 'estado',
    render: (_: unknown, record: Analysis) =>
      record.validacion_experto?.fue_corregido ? (
        <Tag color="green">Validado</Tag>
      ) : (
        <Tag color="orange">Pendiente</Tag>
      ),
  },
];

function AnalisisTab({ validado }: { validado: boolean | 'all' }) {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useAnalisisList(validado, page);

  return (
    <>
      <Table
        rowKey="_id"
        dataSource={query.data?.data ?? []}
        columns={columns}
        loading={query.isLoading}
        onRow={(record) => ({ onClick: () => setSelectedId(record._id) })}
        rowClassName={() => 'cursor-pointer'}
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
            children: <AnalisisTab validado={false} />,
          },
          {
            key: 'validados',
            label: 'Validados',
            children: <AnalisisTab validado={true} />,
          },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
cd zarza-web
git add src/analisis/AnalisisPage.tsx
git commit -m "feat(zarza-web): add AnalisisPage with Pendientes/Validados tabs"
```

---

## Task 9: Wire route and sidebar

**Files:**
- Modify: `zarza-web/src/App.tsx`
- Modify: `zarza-web/src/shared/AppShell.tsx`

- [ ] **Step 9.1: Add `/analisis` route in `App.tsx`**

In `zarza-web/src/App.tsx`, add the import and the route. Replace the full file:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './auth/PrivateRoute';
import { LoginPage } from './auth/LoginPage';
import { AppShell } from './shared/AppShell';
import { Forbidden403Page } from './shared/Forbidden403Page';
import { NotFound404Page } from './shared/NotFound404Page';
import { DashboardPage } from './dashboard/DashboardPage';
import { CamposPage } from './campos/CamposPage';
import { SolicitudesPage } from './solicitudes/SolicitudesPage';
import { AnalisisPage } from './analisis/AnalisisPage';
import { Role } from './auth/types';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<Forbidden403Page />} />

      <Route element={<PrivateRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            element={<PrivateRoute allowedRoles={[Role.ADMIN, Role.PRODUCTOR]} />}
          >
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route
            element={
              <PrivateRoute allowedRoles={[Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO]} />
            }
          >
            <Route path="/campos" element={<CamposPage />} />
          </Route>

          <Route
            element={
              <PrivateRoute allowedRoles={[Role.ADMIN, Role.AGRONOMO, Role.MONITOR]} />
            }
          >
            <Route path="/solicitudes" element={<SolicitudesPage />} />
          </Route>

          <Route
            element={
              <PrivateRoute allowedRoles={[Role.ADMIN, Role.AGRONOMO]} />
            }
          >
            <Route path="/analisis" element={<AnalisisPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound404Page />} />
    </Routes>
  );
}
```

- [ ] **Step 9.2: Add sidebar link in `AppShell.tsx`**

In `zarza-web/src/shared/AppShell.tsx`, add the `SearchOutlined` icon import and the `/analisis` nav item. Replace the full file:
```tsx
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Space, notification } from 'antd';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  AuditOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const NAV_ITEMS = [
  {
    key: '/dashboard',
    label: 'Dashboard',
    icon: <DashboardOutlined />,
    roles: [Role.ADMIN, Role.PRODUCTOR],
  },
  {
    key: '/campos',
    label: 'Campos / Huertas',
    icon: <EnvironmentOutlined />,
    roles: [Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO],
  },
  {
    key: '/solicitudes',
    label: 'Solicitudes',
    icon: <FileTextOutlined />,
    roles: [Role.ADMIN, Role.AGRONOMO, Role.MONITOR],
  },
  {
    key: '/analisis',
    label: 'Revisión IA',
    icon: <AuditOutlined />,
    roles: [Role.ADMIN, Role.AGRONOMO],
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  ).map(({ key, label, icon }) => ({ key, label, icon }));

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      notification.error({ message: 'Error al cerrar sesión' });
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: collapsed ? 14 : 18,
            padding: '0 16px',
          }}
        >
          {collapsed ? 'ZA' : 'Zarza AI'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={visibleItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 16,
          }}
        >
          <Space>
            <Text>{user?.email}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user?.role}
            </Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              Salir
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 9.3: Verify TypeScript compiles**

```bash
cd zarza-web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9.4: Commit**

```bash
cd zarza-web
git add src/App.tsx src/shared/AppShell.tsx
git commit -m "feat(zarza-web): add /analisis route and sidebar link for ADMIN and AGRONOMO"
```

---

## Task 10: Manual smoke test

- [ ] **Step 10.1: Start the backend**

```bash
cd fruit-backend
pnpm run start:dev
```

Expected: server starts on port 3001 with no errors.

- [ ] **Step 10.2: Start the frontend**

```bash
cd zarza-web
pnpm run dev
```

Expected: Vite dev server starts on port 5173.

- [ ] **Step 10.3: Test as AGRONOMO**

1. Log in with an AGRONOMO account.
2. Verify "Revisión IA" appears in the sidebar.
3. Navigate to `/analisis` — the Pendientes tab shows analyses without validation.
4. Click a row — the modal opens with the image (or placeholder), AI metrics, and phenological stages.
5. Correct the stage counts, add observations, click "Guardar corrección".
6. Verify the analysis moves to the Validados tab.

- [ ] **Step 10.4: Test as ADMIN**

1. Log in with an ADMIN account.
2. Verify "Revisión IA" appears in the sidebar.
3. Open a validated analysis — correction form fields are disabled, no "Guardar corrección" button visible.

- [ ] **Step 10.5: Final commit (if any fixes needed)**

```bash
git add -p
git commit -m "fix: smoke test corrections"
```
