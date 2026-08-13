# Captura de Detecciones y Corrección Humana — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capturar los bounding boxes que YOLO ya calcula pero descarta, persistirlos, y dar a `AGRONOMO`/`ADMIN` una pantalla en `zarza-web` para corregirlos (cambiar etapa, marcar sano/enfermo, eliminar falsos positivos, agregar detecciones que faltaron).

**Architecture:** Pipeline secuencial de 5 servicios: `packages/database` (schema Prisma: `Detection` inmutable + `ModelFeedback` append-only) → `fruit-inference` (agrega `detecciones` a la respuesta de `/analyze`) → `fruit-ms` (persiste `Detection` al guardar cada análisis) → `fruit-backend` (4 endpoints REST bajo scope AGRONOMO/ADMIN) → `zarza-web` (cola de revisión + pantalla de corrección con overlay SVG sobre la imagen).

**Tech Stack:** Prisma 6/PostgreSQL, FastAPI/Python (pytest), NestJS 11 (Jest), React 18/Vite/antd (sin suite de tests — verificación manual con dev server).

**Spec:** [[2026-08-11-deteccion-feedback-design]]

---

## File Structure

### `packages/database`
- Modify: `prisma/schema.prisma` — enums `OrigenDeteccion`/`EstadoSalud`/`AccionFeedback`, modelos `Detection`/`ModelFeedback`, columnas nuevas en `Analysis`, relaciones inversas en `User`.

### `fruit-inference`
- Modify: `domain/analysis.py` — `build_report` agrega `detecciones` al reporte.
- Create: `tests/test_analysis.py` — cobertura de `build_report` (no existía antes).

### `fruit-ms`
- Modify: `src/fruits/dto/analysis-response.dto.ts` — `DeteccionDto` + campo `detecciones`.
- Modify: `src/fruits/domain/analysis.entity.ts` — tipo `Deteccion` + campo `detecciones` en `AnalysisDomain`.
- Modify: `src/fruits/infrastructure/inference.mapper.ts` — mapea `detecciones`.
- Modify: `src/fruits/infrastructure/inference.mapper.spec.ts` — fixture + test nuevo.
- Modify: `src/fruits/infrastructure/analysis.prisma.repository.ts` — persiste `Detection` en `save()`.
- Create: `src/fruits/infrastructure/analysis.prisma.repository.spec.ts` — no existía antes.

### `fruit-backend`
- Create: `src/analyses/dto/create-detection.dto.ts`
- Create: `src/analyses/dto/detection-feedback.dto.ts`
- Modify: `src/analyses/dto/list-analyses-query.dto.ts` — filtro `revision_detecciones`.
- Modify: `src/analyses/analyses.service.ts` — `listDetections`, `addDetection`, `addFeedback`, `markReviewed` + helpers privados.
- Modify: `src/analyses/analyses.controller.ts` — 4 endpoints nuevos + refactor `assertInScope`.
- Create: `src/analyses/analyses.service.spec.ts` — no existía antes.

### `zarza-web`
- Create: `src/revision-detecciones/types.ts`
- Create: `src/revision-detecciones/useDetecciones.ts`
- Create: `src/revision-detecciones/DeteccionOverlay.tsx`
- Create: `src/revision-detecciones/DeteccionPanel.tsx`
- Create: `src/revision-detecciones/RevisionDeteccionesPage.tsx`
- Create: `src/revision-detecciones/ColaRevisionPage.tsx`
- Modify: `src/App.tsx` — rutas `/revision-detecciones` y `/analisis/:id/revision-detecciones`.
- Modify: `src/shared/AppShell.tsx` — item de navegación.
- Modify: `src/analisis/AnalisisDetailModal.tsx` — botón "Revisar detecciones →".

---

## Task 1: Modelo de datos (`packages/database`)

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Agregar los enums nuevos**

En `packages/database/prisma/schema.prisma`, reemplazar:

```prisma
enum EstadoValidacion {
  pendiente
  validado
  rechazado
}

model User {
```

por:

```prisma
enum EstadoValidacion {
  pendiente
  validado
  rechazado
}

enum OrigenDeteccion {
  MODELO
  HUMANO
}

enum EstadoSalud {
  SANO
  ENFERMO
}

enum AccionFeedback {
  EDITAR
  ELIMINAR
}

model User {
```

- [ ] **Step 2: Agregar las relaciones inversas en `User`**

Reemplazar:

```prisma
  refreshTokens        RefreshToken[]
  notifications        Notification[]

  @@map("users")
```

por:

```prisma
  refreshTokens                RefreshToken[]
  notifications                Notification[]
  detectionsCreadas            Detection[]
  modelFeedbackCreado          ModelFeedback[]
  analysesDeteccionesRevisadas Analysis[]      @relation("AnalysisDeteccionesRevisadas")

  @@map("users")
```

- [ ] **Step 3: Agregar columnas y relaciones nuevas en `Analysis`**

Reemplazar:

```prisma
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
```

por:

```prisma
  validacionObservaciones       String?           @map("validacion_observaciones")
  deteccionesRevisadas          Boolean           @default(false) @map("detecciones_revisadas")
  deteccionesRevisadasPorId     String?           @map("detecciones_revisadas_por_id") @db.Uuid
  deteccionesRevisadasAt        DateTime?         @map("detecciones_revisadas_at")
  createdAt                     DateTime          @default(now()) @map("created_at")
  updatedAt                     DateTime          @updatedAt @map("updated_at")

  requester               User             @relation("AnalysisRequester", fields: [requesterUserId], references: [id])
  productor                User             @relation("AnalysisProductor", fields: [productorId], references: [id])
  campo                    Campo            @relation(fields: [campoId], references: [id])
  validadoPor              User?            @relation("AnalysisValidador", fields: [validacionCorregidoPorId], references: [id])
  deteccionesRevisadasPor  User?            @relation("AnalysisDeteccionesRevisadas", fields: [deteccionesRevisadasPorId], references: [id])
  fenologiaEtapas          FenologiaEtapa[]
  detections               Detection[]
  modelFeedback            ModelFeedback[]

  @@map("analyses")
}
```

- [ ] **Step 4: Agregar los modelos `Detection` y `ModelFeedback`**

Reemplazar:

```prisma
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

model RefreshToken {
```

por:

```prisma
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

model Detection {
  id             String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  analysisId     String          @map("analysis_id") @db.Uuid
  origen         OrigenDeteccion @default(MODELO)
  claseDetectada String?         @map("clase_detectada")
  etapaDetectada String          @map("etapa_detectada")
  saludDetectada EstadoSalud     @default(SANO) @map("salud_detectada")
  confidence     Float?
  bboxX1         Float           @map("bbox_x1")
  bboxY1         Float           @map("bbox_y1")
  bboxX2         Float           @map("bbox_x2")
  bboxY2         Float           @map("bbox_y2")
  creadoPorId    String?         @map("creado_por_id") @db.Uuid
  createdAt      DateTime        @default(now()) @map("created_at")

  analysis  Analysis        @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  creadoPor User?           @relation(fields: [creadoPorId], references: [id])
  feedback  ModelFeedback[]

  @@index([analysisId])
  @@map("detections")
}

model ModelFeedback {
  id             String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  analysisId     String         @map("analysis_id") @db.Uuid
  detectionId    String         @map("detection_id") @db.Uuid
  accion         AccionFeedback
  etapaCorregida String?        @map("etapa_corregida")
  saludCorregida EstadoSalud?   @map("salud_corregida")
  bboxX1         Float?         @map("bbox_x1")
  bboxY1         Float?         @map("bbox_y1")
  bboxX2         Float?         @map("bbox_x2")
  bboxY2         Float?         @map("bbox_y2")
  observaciones  String?
  creadoPorId    String         @map("creado_por_id") @db.Uuid
  createdAt      DateTime       @default(now()) @map("created_at")

  analysis  Analysis  @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  detection Detection @relation(fields: [detectionId], references: [id], onDelete: Cascade)
  creadoPor User      @relation(fields: [creadoPorId], references: [id])

  @@index([analysisId])
  @@index([detectionId, createdAt(sort: Desc)])
  @@map("model_feedback")
}

model RefreshToken {
```

- [ ] **Step 5: Generar el cliente Prisma y crear la migración**

Run:
```bash
cd packages/database && pnpm run generate && pnpm run migrate:dev --name add_detection_feedback
```
Expected: la migración se crea en `packages/database/prisma/migrations/`, se aplica sin error contra la base de datos local, y termina con `✔ Generated Prisma Client`.

- [ ] **Step 6: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations
git commit -m "feat(database): agregar Detection y ModelFeedback para captura de bounding boxes"
```

---

## Task 2: Captura de bbox/confidence en `fruit-inference`

**Files:**
- Modify: `fruit-inference/domain/analysis.py`
- Test: `fruit-inference/tests/test_analysis.py`

- [ ] **Step 1: Escribir el test que falla**

Create `fruit-inference/tests/test_analysis.py`:

```python
"""
Tests de dominio para build_report — cobertura de detecciones individuales
(bbox + confidence) agregadas a la respuesta de análisis.
"""

import numpy as np
import pytest

from domain.analysis import build_report


@pytest.fixture
def bgr_img():
    return np.zeros((100, 100, 3), dtype=np.uint8)


def test_incluye_detecciones_con_clase_etapa_sano_confidence_y_bbox(bgr_img):
    detections = [
        {"class": "naranja", "confidence": 0.87, "bbox": (10, 20, 30, 40)},
    ]

    report = build_report(detections, bgr_img, "img-1", "regina")

    assert report["detecciones"] == [
        {
            "clase": "naranja",
            "etapa": "naranja",
            "sano": True,
            "confidence": 0.87,
            "bbox": (10, 20, 30, 40),
        }
    ]


def test_detecciones_descarta_clases_desconocidas_igual_que_el_resto_del_reporte(bgr_img):
    detections = [
        {"class": "verde", "confidence": 0.9, "bbox": (0, 0, 10, 10)},
        {"class": "maduro", "confidence": 0.95, "bbox": (10, 10, 20, 20)},
        {"class": "clase_desconocida", "confidence": 0.5, "bbox": (20, 20, 30, 30)},
    ]

    report = build_report(detections, bgr_img, "img-1", None)

    assert len(report["detecciones"]) == 2


def test_detecciones_vacio_cuando_no_hay_detecciones(bgr_img):
    report = build_report([], bgr_img, "img-1", None)

    assert report["detecciones"] == []
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd fruit-inference && pytest tests/test_analysis.py -v`
Expected: FAIL — `KeyError: 'detecciones'` (la clave todavía no existe en el dict retornado por `build_report`).

- [ ] **Step 3: Implementar el cambio en `build_report`**

En `fruit-inference/domain/analysis.py`, reemplazar:

```python
    etapa_counts:  dict[str, int]   = {}
    etapa_pesos:   dict[str, float] = {}
    peso_sano_total = 0.0
    total = sanos = enfermos = 0

    for det in detections:
```

por:

```python
    etapa_counts:  dict[str, int]   = {}
    etapa_pesos:   dict[str, float] = {}
    peso_sano_total = 0.0
    total = sanos = enfermos = 0
    detecciones_reporte: list[dict] = []

    for det in detections:
```

Reemplazar:

```python
        etapa_pesos[etapa] = etapa_pesos.get(etapa, 0.0) + peso

        if info["sano"]:
```

por:

```python
        etapa_pesos[etapa] = etapa_pesos.get(etapa, 0.0) + peso

        detecciones_reporte.append({
            "clase":      cls,
            "etapa":      etapa,
            "sano":       info["sano"],
            "confidence": det["confidence"],
            "bbox":       det["bbox"],
        })

        if info["sano"]:
```

Reemplazar:

```python
        "cronograma_fenologico": cronograma,
    }
```

por:

```python
        "cronograma_fenologico": cronograma,
        "detecciones":           detecciones_reporte,
    }
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd fruit-inference && pytest tests/test_analysis.py -v`
Expected: PASS — 3 tests verdes.

- [ ] **Step 5: Correr toda la suite de fruit-inference para descartar regresiones**

Run: `cd fruit-inference && pytest -v`
Expected: PASS — todos los tests existentes (`test_auth.py`, `test_image_preprocessor.py`, `test_r2_client.py`) siguen en verde.

- [ ] **Step 6: Commit**

```bash
git add fruit-inference/domain/analysis.py fruit-inference/tests/test_analysis.py
git commit -m "feat(fruit-inference): incluir bbox y confidence por detección en el reporte"
```

---

## Task 3: DTO y dominio de detecciones en `fruit-ms`

**Files:**
- Modify: `fruit-ms/src/fruits/dto/analysis-response.dto.ts`
- Modify: `fruit-ms/src/fruits/domain/analysis.entity.ts`
- Modify: `fruit-ms/src/fruits/infrastructure/inference.mapper.ts`
- Modify: `fruit-ms/src/fruits/infrastructure/inference.mapper.spec.ts`

- [ ] **Step 1: Escribir el test que falla para el mapeo de `detecciones`**

En `fruit-ms/src/fruits/infrastructure/inference.mapper.spec.ts`, dentro de `validDto`, reemplazar:

```ts
    cronograma_fenologico: [
      {
        etapa: 'Floración',
        cantidad: 5,
        prediccion: {
          cambio_a: 'Fruto',
          en_dias: 10,
          dias_para_cosecha: 60,
        },
      },
    ],
  };
```

por:

```ts
    cronograma_fenologico: [
      {
        etapa: 'Floración',
        cantidad: 5,
        prediccion: {
          cambio_a: 'Fruto',
          en_dias: 10,
          dias_para_cosecha: 60,
        },
      },
    ],
    detecciones: [
      {
        clase: 'naranja',
        etapa: 'naranja',
        sano: true,
        confidence: 0.87,
        bbox: [10, 20, 30, 40],
      },
    ],
  };
```

En el mismo archivo, dentro del test `'convierte correctamente un DTO completo a AnalysisDomain'`, reemplazar:

```ts
        cronograma_fenologico: [
          {
            etapa: 'Floración',
            cantidad: 5,
            prediccion: {
              cambio_a: 'Fruto',
              en_dias: 10,
              dias_para_cosecha: 60,
            },
          },
        ],
        campo_id: null,
```

por:

```ts
        cronograma_fenologico: [
          {
            etapa: 'Floración',
            cantidad: 5,
            prediccion: {
              cambio_a: 'Fruto',
              en_dias: 10,
              dias_para_cosecha: 60,
            },
          },
        ],
        detecciones: [
          {
            clase: 'naranja',
            etapa: 'naranja',
            sano: true,
            confidence: 0.87,
            bbox: [10, 20, 30, 40],
          },
        ],
        campo_id: null,
```

Al final del archivo, reemplazar (el último bloque `it` del `describe('cronograma fenológico')` y sus dos llaves de cierre finales):

```ts
    it('devuelve un arreglo vacío cuando no hay etapas', () => {
      const dto = {
        ...validDto,
        cronograma_fenologico: [],
      };

      const result = InferenceMapper.toDomain(dto, 'storage-key', requester);

      expect(result.cronograma_fenologico).toEqual([]);
    });
  });
});
```

por:

```ts
    it('devuelve un arreglo vacío cuando no hay etapas', () => {
      const dto = {
        ...validDto,
        cronograma_fenologico: [],
      };

      const result = InferenceMapper.toDomain(dto, 'storage-key', requester);

      expect(result.cronograma_fenologico).toEqual([]);
    });
  });

  describe('detecciones', () => {
    it('mapea clase, etapa, sano, confidence y bbox', () => {
      const result = InferenceMapper.toDomain(validDto, 'storage-key', requester);

      expect(result.detecciones).toEqual([
        {
          clase: 'naranja',
          etapa: 'naranja',
          sano: true,
          confidence: 0.87,
          bbox: [10, 20, 30, 40],
        },
      ]);
    });

    it('devuelve un arreglo vacío cuando no hay detecciones', () => {
      const dto = { ...validDto, detecciones: [] };

      const result = InferenceMapper.toDomain(dto, 'storage-key', requester);

      expect(result.detecciones).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd fruit-ms && pnpm exec jest src/fruits/infrastructure/inference.mapper.spec.ts -v`
Expected: FAIL — errores de tipo TS (`detecciones` no existe en `AnalysisResponseDto` ni en el resultado de `toDomain`).

- [ ] **Step 3: Agregar `DeteccionDto` y el campo `detecciones` al DTO de red**

En `fruit-ms/src/fruits/dto/analysis-response.dto.ts`, reemplazar:

```ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsString,
  IsDateString,
  ValidateNested,
  IsOptional,
} from 'class-validator';
```

por:

```ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsString,
  IsDateString,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
```

Reemplazar:

```ts
export class EtapaFenologicaDto {
  @IsString()
  etapa: string;

  @IsNumber()
  cantidad: number;

  @ValidateNested()
  @Type(() => PrediccionDto)
  prediccion: PrediccionDto;
}
```

por:

```ts
export class EtapaFenologicaDto {
  @IsString()
  etapa: string;

  @IsNumber()
  cantidad: number;

  @ValidateNested()
  @Type(() => PrediccionDto)
  prediccion: PrediccionDto;
}

export class DeteccionDto {
  @IsString()
  clase: string;

  @IsString()
  etapa: string;

  @IsBoolean()
  sano: boolean;

  @IsNumber()
  confidence: number;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsNumber({}, { each: true })
  bbox: [number, number, number, number];
}
```

Reemplazar:

```ts
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EtapaFenologicaDto)
  cronograma_fenologico: EtapaFenologicaDto[];
}
```

por:

```ts
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EtapaFenologicaDto)
  cronograma_fenologico: EtapaFenologicaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeteccionDto)
  detecciones: DeteccionDto[];
}
```

- [ ] **Step 4: Agregar el tipo `Deteccion` y el campo `detecciones` a `AnalysisDomain`**

En `fruit-ms/src/fruits/domain/analysis.entity.ts`, reemplazar:

```ts
export type EtapaFenologica = {
  etapa: string;
  cantidad: number;
  prediccion: Prediccion;
};
```

por:

```ts
export type EtapaFenologica = {
  etapa: string;
  cantidad: number;
  prediccion: Prediccion;
};

export type Deteccion = {
  clase: string;
  etapa: string;
  sano: boolean;
  confidence: number;
  bbox: [number, number, number, number];
};
```

Reemplazar:

```ts
  cronograma_fenologico: EtapaFenologica[];

  // ── V2: trazabilidad, geolocalización, offline, validación ──
```

por:

```ts
  cronograma_fenologico: EtapaFenologica[];
  detecciones: Deteccion[];

  // ── V2: trazabilidad, geolocalización, offline, validación ──
```

- [ ] **Step 5: Mapear `detecciones` en `InferenceMapper`**

En `fruit-ms/src/fruits/infrastructure/inference.mapper.ts`, reemplazar:

```ts
      cronograma_fenologico: dto.cronograma_fenologico.map((etapa) => ({
        etapa: etapa.etapa,
        cantidad: etapa.cantidad,
        prediccion: {
          cambio_a: etapa.prediccion.cambio_a,
          en_dias: etapa.prediccion.en_dias,
          dias_para_cosecha: etapa.prediccion.dias_para_cosecha,
        },
      })),
      // V2 fields
```

por:

```ts
      cronograma_fenologico: dto.cronograma_fenologico.map((etapa) => ({
        etapa: etapa.etapa,
        cantidad: etapa.cantidad,
        prediccion: {
          cambio_a: etapa.prediccion.cambio_a,
          en_dias: etapa.prediccion.en_dias,
          dias_para_cosecha: etapa.prediccion.dias_para_cosecha,
        },
      })),
      detecciones: dto.detecciones.map((d) => ({
        clase: d.clase,
        etapa: d.etapa,
        sano: d.sano,
        confidence: d.confidence,
        bbox: d.bbox,
      })),
      // V2 fields
```

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `cd fruit-ms && pnpm exec jest src/fruits/infrastructure/inference.mapper.spec.ts -v`
Expected: PASS — todos los tests del archivo, incluido el nuevo bloque `detecciones`.

- [ ] **Step 7: Commit**

```bash
git add fruit-ms/src/fruits/dto/analysis-response.dto.ts fruit-ms/src/fruits/domain/analysis.entity.ts fruit-ms/src/fruits/infrastructure/inference.mapper.ts fruit-ms/src/fruits/infrastructure/inference.mapper.spec.ts
git commit -m "feat(fruit-ms): mapear detecciones individuales del DTO de inferencia al dominio"
```

---

## Task 4: Persistencia de `Detection` en `fruit-ms`

**Files:**
- Modify: `fruit-ms/src/fruits/infrastructure/analysis.prisma.repository.ts`
- Test: `fruit-ms/src/fruits/infrastructure/analysis.prisma.repository.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `fruit-ms/src/fruits/infrastructure/analysis.prisma.repository.spec.ts`:

```ts
import { PrismaAnalysisRepository } from './analysis.prisma.repository';
import { PrismaService } from '@rubus/database';
import type { AnalysisDomain } from '../domain/analysis.entity';

function buildAnalysis(overrides: Partial<AnalysisDomain> = {}): AnalysisDomain {
  return {
    image_id: 'img-1',
    storage_key: 'key-1',
    requester: { userId: 'user-1', email: 'a@b.com' },
    variedad: null,
    fecha_analisis: new Date('2026-08-11T00:00:00.000Z'),
    metricas_salud: {
      total_elementos_detectados: 1,
      elementos_sanos: 1,
      elementos_enfermos: 0,
      porcentaje_merma_general: 0,
    },
    proyeccion_financiera: { peso_sano_gramos: 3.5 },
    cronograma_fenologico: [],
    detecciones: [],
    campo_id: 'campo-1',
    productor_id: 'productor-1',
    ubicacion_gps: null,
    offline_sync_id: null,
    validacion_experto: null,
    ...overrides,
  };
}

function buildTx() {
  return {
    analysis: { create: jest.fn().mockResolvedValue({ id: 'analysis-1' }) },
    fenologiaEtapa: { createMany: jest.fn() },
    detection: { createMany: jest.fn() },
  };
}

describe('PrismaAnalysisRepository — persistencia de detecciones', () => {
  it('crea una fila Detection por cada elemento de detecciones, con origen MODELO', async () => {
    const tx = buildTx();
    const prisma = { $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)) };
    const repo = new PrismaAnalysisRepository(prisma as unknown as PrismaService);

    await repo.save(
      buildAnalysis({
        detecciones: [
          { clase: 'naranja', etapa: 'naranja', sano: true, confidence: 0.87, bbox: [1, 2, 3, 4] },
        ],
      }),
    );

    expect(tx.detection.createMany).toHaveBeenCalledWith({
      data: [
        {
          analysisId: 'analysis-1',
          origen: 'MODELO',
          claseDetectada: 'naranja',
          etapaDetectada: 'naranja',
          saludDetectada: 'SANO',
          confidence: 0.87,
          bboxX1: 1,
          bboxY1: 2,
          bboxX2: 3,
          bboxY2: 4,
        },
      ],
    });
  });

  it('mapea saludDetectada a ENFERMO cuando sano es false', async () => {
    const tx = buildTx();
    const prisma = { $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)) };
    const repo = new PrismaAnalysisRepository(prisma as unknown as PrismaService);

    await repo.save(
      buildAnalysis({
        detecciones: [
          { clase: 'x', etapa: 'maduro', sano: false, confidence: 0.5, bbox: [0, 0, 1, 1] },
        ],
      }),
    );

    expect(tx.detection.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ saludDetectada: 'ENFERMO' })],
    });
  });

  it('no llama a detection.createMany cuando no hay detecciones', async () => {
    const tx = buildTx();
    const prisma = { $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)) };
    const repo = new PrismaAnalysisRepository(prisma as unknown as PrismaService);

    await repo.save(buildAnalysis());

    expect(tx.detection.createMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd fruit-ms && pnpm exec jest src/fruits/infrastructure/analysis.prisma.repository.spec.ts -v`
Expected: FAIL — `tx.detection.createMany` nunca se llama (el repositorio todavía no persiste `Detection`).

- [ ] **Step 3: Persistir las detecciones en `save()`**

En `fruit-ms/src/fruits/infrastructure/analysis.prisma.repository.ts`, reemplazar:

```ts
      if (analysis.cronograma_fenologico.length > 0) {
        await tx.fenologiaEtapa.createMany({
          data: analysis.cronograma_fenologico.map((e: EtapaFenologica) => ({
            analysisId: created.id,
            etapa: e.etapa,
            cantidad: e.cantidad,
            cambiaA: e.prediccion.cambio_a,
            enDias: e.prediccion.en_dias,
            diasParaCosecha: e.prediccion.dias_para_cosecha,
          })),
        });
      }

      return created;
```

por:

```ts
      if (analysis.cronograma_fenologico.length > 0) {
        await tx.fenologiaEtapa.createMany({
          data: analysis.cronograma_fenologico.map((e: EtapaFenologica) => ({
            analysisId: created.id,
            etapa: e.etapa,
            cantidad: e.cantidad,
            cambiaA: e.prediccion.cambio_a,
            enDias: e.prediccion.en_dias,
            diasParaCosecha: e.prediccion.dias_para_cosecha,
          })),
        });
      }

      if (analysis.detecciones.length > 0) {
        await tx.detection.createMany({
          data: analysis.detecciones.map((d: Deteccion) => ({
            analysisId: created.id,
            origen: 'MODELO' as const,
            claseDetectada: d.clase,
            etapaDetectada: d.etapa,
            saludDetectada: d.sano ? 'SANO' : 'ENFERMO',
            confidence: d.confidence,
            bboxX1: d.bbox[0],
            bboxY1: d.bbox[1],
            bboxX2: d.bbox[2],
            bboxY2: d.bbox[3],
          })),
        });
      }

      return created;
```

Reemplazar el import de tipos:

```ts
import type {
  AnalysisDomain,
  EtapaFenologica,
} from '../domain/analysis.entity';
```

por:

```ts
import type {
  AnalysisDomain,
  EtapaFenologica,
  Deteccion,
} from '../domain/analysis.entity';
```

- [ ] **Step 4: Completar `toDomain()` con `detecciones: []`**

Este repositorio también se usa para las consultas internas de fruit-ms (`findAll`/`findById`, patrones RMQ `get_fruits`/`get_fruit_by_id`), que no necesitan exponer detecciones individuales — solo el path de escritura (`save()`) las usa. Reemplazar:

```ts
      proyeccion_financiera: { peso_sano_gramos: doc.pesoSanoGramos },
      cronograma_fenologico: (doc.fenologiaEtapas ?? []).map((e: any) => ({
```

por:

```ts
      proyeccion_financiera: { peso_sano_gramos: doc.pesoSanoGramos },
      // No se consultan detecciones individuales en este path de lectura —
      // solo lo usa fruit-backend directamente contra Detection/ModelFeedback.
      detecciones: [],
      cronograma_fenologico: (doc.fenologiaEtapas ?? []).map((e: any) => ({
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd fruit-ms && pnpm exec jest src/fruits/infrastructure/analysis.prisma.repository.spec.ts -v`
Expected: PASS — 3 tests verdes.

- [ ] **Step 6: Correr toda la suite de fruit-ms para descartar regresiones**

Run: `cd fruit-ms && pnpm exec jest -v`
Expected: PASS — toda la suite, incluidos `fruits.service.spec.ts`, `fruits.controller.spec.ts`, `fruits.integration.spec.ts`.

- [ ] **Step 7: Commit**

```bash
git add fruit-ms/src/fruits/infrastructure/analysis.prisma.repository.ts fruit-ms/src/fruits/infrastructure/analysis.prisma.repository.spec.ts
git commit -m "feat(fruit-ms): persistir Detection al guardar cada análisis"
```

---

## Task 5: DTOs de detección/feedback en `fruit-backend`

**Files:**
- Create: `fruit-backend/src/analyses/dto/create-detection.dto.ts`
- Create: `fruit-backend/src/analyses/dto/detection-feedback.dto.ts`
- Modify: `fruit-backend/src/analyses/dto/list-analyses-query.dto.ts`

- [ ] **Step 1: Crear `create-detection.dto.ts`**

Create `fruit-backend/src/analyses/dto/create-detection.dto.ts`:

```ts
import {
  IsArray,
  IsBoolean,
  IsIn,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const ETAPAS_CONOCIDAS = [
  'boton',
  'flor',
  'verde',
  'naranja',
  'marron',
  'maduro',
  'deteccion_gen',
] as const;

export type EtapaConocida = (typeof ETAPAS_CONOCIDAS)[number];

export class CreateDetectionDto {
  @ApiProperty({ enum: ETAPAS_CONOCIDAS, example: 'naranja' })
  @IsIn(ETAPAS_CONOCIDAS)
  etapa: EtapaConocida;

  @ApiProperty({ example: true, description: 'true = sano, false = enfermo' })
  @IsBoolean()
  sano: boolean;

  @ApiProperty({
    example: [120.5, 340.2, 210.8, 430.1],
    description:
      'Bounding box [x1, y1, x2, y2] en píxeles de la imagen original.',
  })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsNumber({}, { each: true })
  bbox: [number, number, number, number];
}
```

- [ ] **Step 2: Crear `detection-feedback.dto.ts`**

Create `fruit-backend/src/analyses/dto/detection-feedback.dto.ts`:

```ts
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ETAPAS_CONOCIDAS, EtapaConocida } from './create-detection.dto';

export const ACCION_FEEDBACK_VALUES = ['EDITAR', 'ELIMINAR'] as const;
export type AccionFeedbackValue = (typeof ACCION_FEEDBACK_VALUES)[number];

export class DetectionFeedbackDto {
  @ApiProperty({ enum: ACCION_FEEDBACK_VALUES })
  @IsIn(ACCION_FEEDBACK_VALUES)
  accion: AccionFeedbackValue;

  @ApiPropertyOptional({ enum: ETAPAS_CONOCIDAS })
  @IsOptional()
  @IsIn(ETAPAS_CONOCIDAS)
  etapaCorregida?: EtapaConocida;

  @ApiPropertyOptional({ description: 'true = sano, false = enfermo' })
  @IsOptional()
  @IsBoolean()
  saludCorregida?: boolean;

  @ApiPropertyOptional({ example: [120.5, 340.2, 210.8, 430.1] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsNumber({}, { each: true })
  bbox?: [number, number, number, number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
```

- [ ] **Step 3: Agregar el filtro `revision_detecciones` a `ListAnalysesQueryDto`**

En `fruit-backend/src/analyses/dto/list-analyses-query.dto.ts`, reemplazar:

```ts
export const ANALYSIS_ESTADO_VALUES = [
  'pendiente',
  'validado',
  'rechazado',
  'all',
] as const;

export type AnalysisEstadoFilter = (typeof ANALYSIS_ESTADO_VALUES)[number];
```

por:

```ts
export const ANALYSIS_ESTADO_VALUES = [
  'pendiente',
  'validado',
  'rechazado',
  'all',
] as const;

export type AnalysisEstadoFilter = (typeof ANALYSIS_ESTADO_VALUES)[number];

export const REVISION_DETECCIONES_VALUES = [
  'pendiente',
  'revisado',
  'all',
] as const;

export type RevisionDeteccionesFilter =
  (typeof REVISION_DETECCIONES_VALUES)[number];
```

Reemplazar:

```ts
  @IsOptional()
  @IsString()
  campo_id?: string;
}
```

por:

```ts
  @IsOptional()
  @IsString()
  campo_id?: string;

  @ApiPropertyOptional({
    enum: REVISION_DETECCIONES_VALUES,
    description: 'Filtrar por estado de revisión de detecciones.',
  })
  @IsOptional()
  @IsIn(REVISION_DETECCIONES_VALUES)
  revision_detecciones?: RevisionDeteccionesFilter;
}
```

`IsIn` ya está importado en este archivo (se usa para `estado`), así que no hace falta tocar la línea de imports.

- [ ] **Step 4: Verificar que el proyecto compila**

Run: `cd fruit-backend && pnpm run build`
Expected: compila sin errores (los DTOs nuevos no se usan todavía en ningún controller/service, pero deben ser sintácticamente válidos).

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/analyses/dto/create-detection.dto.ts fruit-backend/src/analyses/dto/detection-feedback.dto.ts fruit-backend/src/analyses/dto/list-analyses-query.dto.ts
git commit -m "feat(fruit-backend): agregar DTOs de creación y feedback de detecciones"
```

---

## Task 6: Lógica de negocio en `AnalysesService`

**Files:**
- Modify: `fruit-backend/src/analyses/analyses.service.ts`
- Test: `fruit-backend/src/analyses/analyses.service.spec.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Create `fruit-backend/src/analyses/analyses.service.spec.ts`:

```ts
import { AnalysesService } from './analyses.service';
import { PrismaService } from '@rubus/database';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { IStoragePort } from '../storage/ports';
import type { AppLogger } from '../common/logging/app.logger';

describe('AnalysesService — detecciones', () => {
  let prisma: any;
  let storage: { getPresignedUrl: jest.Mock };
  let logger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock };
  let service: AnalysesService;

  beforeEach(() => {
    prisma = {
      analysis: { findUnique: jest.fn(), update: jest.fn() },
      detection: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      modelFeedback: { create: jest.fn() },
    };
    storage = { getPresignedUrl: jest.fn() };
    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    service = new AnalysesService(
      prisma as unknown as PrismaService,
      storage as unknown as IStoragePort,
      logger as unknown as AppLogger,
    );
  });

  describe('listDetections()', () => {
    it('usa el valor original cuando la detección no tiene feedback', async () => {
      prisma.detection.findMany.mockResolvedValue([
        {
          id: 'det-1',
          origen: 'MODELO',
          confidence: 0.9,
          etapaDetectada: 'naranja',
          saludDetectada: 'SANO',
          bboxX1: 1, bboxY1: 2, bboxX2: 3, bboxY2: 4,
          feedback: [],
        },
      ]);

      const result = await service.listDetections('analysis-1');

      expect(result).toEqual([
        {
          id: 'det-1',
          origen: 'MODELO',
          confidence: 0.9,
          etapa: 'naranja',
          sano: true,
          bbox: [1, 2, 3, 4],
          eliminada: false,
        },
      ]);
    });

    it('usa el feedback más reciente cuando existe', async () => {
      prisma.detection.findMany.mockResolvedValue([
        {
          id: 'det-1',
          origen: 'MODELO',
          confidence: 0.9,
          etapaDetectada: 'naranja',
          saludDetectada: 'SANO',
          bboxX1: 1, bboxY1: 2, bboxX2: 3, bboxY2: 4,
          feedback: [
            {
              accion: 'EDITAR',
              etapaCorregida: 'maduro',
              saludCorregida: 'ENFERMO',
              bboxX1: null, bboxY1: null, bboxX2: null, bboxY2: null,
            },
          ],
        },
      ]);

      const result = await service.listDetections('analysis-1');

      expect(result[0]).toEqual(
        expect.objectContaining({ etapa: 'maduro', sano: false, bbox: [1, 2, 3, 4] }),
      );
    });

    it('marca eliminada=true cuando el último feedback es ELIMINAR', async () => {
      prisma.detection.findMany.mockResolvedValue([
        {
          id: 'det-1',
          origen: 'MODELO',
          confidence: 0.9,
          etapaDetectada: 'naranja',
          saludDetectada: 'SANO',
          bboxX1: 1, bboxY1: 2, bboxX2: 3, bboxY2: 4,
          feedback: [
            { accion: 'ELIMINAR', etapaCorregida: null, saludCorregida: null, bboxX1: null, bboxY1: null, bboxX2: null, bboxY2: null },
          ],
        },
      ]);

      const result = await service.listDetections('analysis-1');

      expect(result[0].eliminada).toBe(true);
    });
  });

  describe('addDetection()', () => {
    it('crea una Detection con origen HUMANO', async () => {
      prisma.analysis.findUnique.mockResolvedValue({ id: 'analysis-1', fenologiaEtapas: [], campo: null, deteccionesRevisadas: false });
      prisma.detection.create.mockResolvedValue({
        id: 'det-2', origen: 'HUMANO', confidence: null,
        etapaDetectada: 'verde', saludDetectada: 'SANO',
        bboxX1: 10, bboxY1: 20, bboxX2: 30, bboxY2: 40,
      });

      const result = await service.addDetection('analysis-1', 'user-1', {
        etapa: 'verde', sano: true, bbox: [10, 20, 30, 40],
      });

      expect(prisma.detection.create).toHaveBeenCalledWith({
        data: {
          analysisId: 'analysis-1',
          origen: 'HUMANO',
          etapaDetectada: 'verde',
          saludDetectada: 'SANO',
          bboxX1: 10, bboxY1: 20, bboxX2: 30, bboxY2: 40,
          creadoPorId: 'user-1',
        },
      });
      expect(result.eliminada).toBe(false);
    });

    it('rechaza un bbox inválido (x1 >= x2)', async () => {
      prisma.analysis.findUnique.mockResolvedValue({ id: 'analysis-1', fenologiaEtapas: [], campo: null, deteccionesRevisadas: false });

      await expect(
        service.addDetection('analysis-1', 'user-1', { etapa: 'verde', sano: true, bbox: [30, 20, 10, 40] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('marca deteccionesRevisadas si aún estaba en false', async () => {
      prisma.analysis.findUnique
        .mockResolvedValueOnce({ id: 'analysis-1', fenologiaEtapas: [], campo: null, deteccionesRevisadas: false })
        .mockResolvedValueOnce({ deteccionesRevisadas: false });
      prisma.detection.create.mockResolvedValue({
        id: 'det-2', origen: 'HUMANO', confidence: null,
        etapaDetectada: 'verde', saludDetectada: 'SANO',
        bboxX1: 10, bboxY1: 20, bboxX2: 30, bboxY2: 40,
      });

      await service.addDetection('analysis-1', 'user-1', { etapa: 'verde', sano: true, bbox: [10, 20, 30, 40] });

      expect(prisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'analysis-1' },
        data: expect.objectContaining({ deteccionesRevisadas: true, deteccionesRevisadasPorId: 'user-1' }),
      });
    });
  });

  describe('addFeedback()', () => {
    it('lanza NotFoundException si la detección no pertenece al análisis', async () => {
      prisma.detection.findFirst.mockResolvedValue(null);

      await expect(
        service.addFeedback('analysis-1', 'det-x', 'user-1', { accion: 'ELIMINAR' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si accion=EDITAR sin etapaCorregida ni saludCorregida', async () => {
      prisma.detection.findFirst.mockResolvedValue({ id: 'det-1', analysisId: 'analysis-1' });

      await expect(
        service.addFeedback('analysis-1', 'det-1', 'user-1', { accion: 'EDITAR' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea un ModelFeedback con accion=ELIMINAR sin campos corregidos', async () => {
      prisma.detection.findFirst.mockResolvedValue({ id: 'det-1', analysisId: 'analysis-1' });
      prisma.analysis.findUnique.mockResolvedValue({ deteccionesRevisadas: true });
      prisma.modelFeedback.create.mockResolvedValue({ id: 'fb-1' });

      await service.addFeedback('analysis-1', 'det-1', 'user-1', { accion: 'ELIMINAR' });

      expect(prisma.modelFeedback.create).toHaveBeenCalledWith({
        data: {
          analysisId: 'analysis-1',
          detectionId: 'det-1',
          accion: 'ELIMINAR',
          etapaCorregida: null,
          saludCorregida: null,
          bboxX1: null, bboxY1: null, bboxX2: null, bboxY2: null,
          observaciones: null,
          creadoPorId: 'user-1',
        },
      });
    });
  });

  describe('markReviewed()', () => {
    it('marca deteccionesRevisadas=true con el usuario y fecha actuales', async () => {
      prisma.analysis.findUnique.mockResolvedValue({ id: 'analysis-1', fenologiaEtapas: [], campo: null });
      prisma.analysis.update.mockResolvedValue({ id: 'analysis-1', deteccionesRevisadas: true });

      await service.markReviewed('analysis-1', 'user-1');

      expect(prisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'analysis-1' },
        data: expect.objectContaining({
          deteccionesRevisadas: true,
          deteccionesRevisadasPorId: 'user-1',
        }),
      });
    });
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd fruit-backend && pnpm exec jest src/analyses/analyses.service.spec.ts -v`
Expected: FAIL — `service.listDetections is not a function` (y errores similares para los otros métodos, que todavía no existen).

- [ ] **Step 3: Implementar los métodos en `AnalysesService`**

En `fruit-backend/src/analyses/analyses.service.ts`, reemplazar el import de excepciones:

```ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
```

por:

```ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
```

Agregar los imports de los DTOs nuevos, después del import de `ValidateAnalysisDto`:

```ts
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { CreateDetectionDto } from './dto/create-detection.dto';
import { DetectionFeedbackDto } from './dto/detection-feedback.dto';
```

Reemplazar la firma de `findAll` y su cuerpo:

```ts
  async findAll(
    pageParam: number,
    limitParam: number,
    estado: 'pendiente' | 'validado' | 'rechazado' | 'all',
    scope: UserScope,
    campoId?: string,
  ) {
    const { page, limit, skip, take } = clampPagination(pageParam, limitParam);
    const where: Record<string, unknown> = {};

    if (estado !== 'all') {
      where.validacionEstado = estado;
    }

    if (scope.role === Role.PRODUCTOR) {
```

por:

```ts
  async findAll(
    pageParam: number,
    limitParam: number,
    estado: 'pendiente' | 'validado' | 'rechazado' | 'all',
    scope: UserScope,
    campoId?: string,
    revisionDetecciones?: 'pendiente' | 'revisado' | 'all',
  ) {
    const { page, limit, skip, take } = clampPagination(pageParam, limitParam);
    const where: Record<string, unknown> = {};

    if (estado !== 'all') {
      where.validacionEstado = estado;
    }

    if (revisionDetecciones && revisionDetecciones !== 'all') {
      where.deteccionesRevisadas = revisionDetecciones === 'revisado';
    }

    if (scope.role === Role.PRODUCTOR) {
```

Al final del archivo, reemplazar el cierre de la clase:

```ts
    this.logger.info('Análisis actualizado', {
      analysisId: id,
      action: dto.action,
      userId: corregidoPorId,
    });
    return updated;
  }
}
```

por:

```ts
    this.logger.info('Análisis actualizado', {
      analysisId: id,
      action: dto.action,
      userId: corregidoPorId,
    });
    return updated;
  }

  async listDetections(analysisId: string) {
    const detections = await this.prisma.detection.findMany({
      where: { analysisId },
      orderBy: { createdAt: 'asc' },
      include: { feedback: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return detections.map((detection) => this.resolveDetectionState(detection));
  }

  async addDetection(
    analysisId: string,
    userId: string,
    dto: CreateDetectionDto,
  ) {
    await this.findById(analysisId);
    this.assertBboxValido(dto.bbox);

    const detection = await this.prisma.detection.create({
      data: {
        analysisId,
        origen: 'HUMANO',
        etapaDetectada: dto.etapa,
        saludDetectada: dto.sano ? 'SANO' : 'ENFERMO',
        bboxX1: dto.bbox[0],
        bboxY1: dto.bbox[1],
        bboxX2: dto.bbox[2],
        bboxY2: dto.bbox[3],
        creadoPorId: userId,
      },
    });

    await this.markReviewedIfNeeded(analysisId, userId);

    const recienCreada = { ...detection, feedback: [] };
    return this.resolveDetectionState(recienCreada);
  }

  async addFeedback(
    analysisId: string,
    detectionId: string,
    userId: string,
    dto: DetectionFeedbackDto,
  ) {
    const detection = await this.prisma.detection.findFirst({
      where: { id: detectionId, analysisId },
    });
    if (!detection) {
      throw new NotFoundException(
        `Detección "${detectionId}" no encontrada en el análisis "${analysisId}"`,
      );
    }

    if (
      dto.accion === 'EDITAR' &&
      dto.etapaCorregida == null &&
      dto.saludCorregida == null
    ) {
      throw new BadRequestException(
        'accion=EDITAR requiere etapaCorregida y/o saludCorregida',
      );
    }
    if (dto.bbox) {
      this.assertBboxValido(dto.bbox);
    }

    const feedback = await this.prisma.modelFeedback.create({
      data: {
        analysisId,
        detectionId,
        accion: dto.accion,
        etapaCorregida: dto.etapaCorregida ?? null,
        saludCorregida:
          dto.saludCorregida == null
            ? null
            : dto.saludCorregida
              ? 'SANO'
              : 'ENFERMO',
        bboxX1: dto.bbox?.[0] ?? null,
        bboxY1: dto.bbox?.[1] ?? null,
        bboxX2: dto.bbox?.[2] ?? null,
        bboxY2: dto.bbox?.[3] ?? null,
        observaciones: dto.observaciones ?? null,
        creadoPorId: userId,
      },
    });

    await this.markReviewedIfNeeded(analysisId, userId);

    return feedback;
  }

  async markReviewed(analysisId: string, userId: string) {
    await this.findById(analysisId);
    return this.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        deteccionesRevisadas: true,
        deteccionesRevisadasPorId: userId,
        deteccionesRevisadasAt: new Date(),
      },
    });
  }

  private async markReviewedIfNeeded(analysisId: string, userId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { deteccionesRevisadas: true },
    });
    if (!analysis?.deteccionesRevisadas) {
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          deteccionesRevisadas: true,
          deteccionesRevisadasPorId: userId,
          deteccionesRevisadasAt: new Date(),
        },
      });
    }
  }

  private assertBboxValido(bbox: [number, number, number, number]) {
    const [x1, y1, x2, y2] = bbox;
    if (x1 >= x2 || y1 >= y2) {
      throw new BadRequestException(
        'bbox inválido: se requiere x1 < x2 y y1 < y2',
      );
    }
  }

  private resolveDetectionState(detection: {
    id: string;
    origen: string;
    confidence: number | null;
    etapaDetectada: string;
    saludDetectada: string;
    bboxX1: number;
    bboxY1: number;
    bboxX2: number;
    bboxY2: number;
    feedback: Array<{
      accion: string;
      etapaCorregida: string | null;
      saludCorregida: string | null;
      bboxX1: number | null;
      bboxY1: number | null;
      bboxX2: number | null;
      bboxY2: number | null;
    }>;
  }) {
    const latest = detection.feedback[0];
    return {
      id: detection.id,
      origen: detection.origen,
      confidence: detection.confidence,
      etapa: latest?.etapaCorregida ?? detection.etapaDetectada,
      sano: (latest?.saludCorregida ?? detection.saludDetectada) === 'SANO',
      bbox:
        latest?.bboxX1 != null
          ? [latest.bboxX1, latest.bboxY1, latest.bboxX2, latest.bboxY2]
          : [
              detection.bboxX1,
              detection.bboxY1,
              detection.bboxX2,
              detection.bboxY2,
            ],
      eliminada: latest?.accion === 'ELIMINAR',
    };
  }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd fruit-backend && pnpm exec jest src/analyses/analyses.service.spec.ts -v`
Expected: PASS — todos los tests verdes.

- [ ] **Step 5: Correr toda la suite de fruit-backend para descartar regresiones**

Run: `cd fruit-backend && pnpm run test`
Expected: PASS — toda la suite existente sigue en verde.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/analyses/analyses.service.ts fruit-backend/src/analyses/analyses.service.spec.ts
git commit -m "feat(fruit-backend): agregar lógica de detecciones y feedback a AnalysesService"
```

---

## Task 7: Endpoints en `AnalysesController`

**Files:**
- Modify: `fruit-backend/src/analyses/analyses.controller.ts`

- [ ] **Step 1: Agregar los imports necesarios**

Reemplazar:

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
  ParseUUIDPipe,
  NotFoundException,
  Inject,
} from '@nestjs/common';
```

por:

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  NotFoundException,
  Inject,
} from '@nestjs/common';
```

Reemplazar:

```ts
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
```

por:

```ts
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { CreateDetectionDto } from './dto/create-detection.dto';
import { DetectionFeedbackDto } from './dto/detection-feedback.dto';
```

- [ ] **Step 2: Pasar `revision_detecciones` en `findAll`**

Reemplazar:

```ts
    const scope = await this.buildScope(req.user);
    return this.analysesService.findAll(
      query.page,
      query.limit,
      query.estado,
      scope,
      query.campo_id,
    );
  }
```

por:

```ts
    const scope = await this.buildScope(req.user);
    return this.analysesService.findAll(
      query.page,
      query.limit,
      query.estado,
      scope,
      query.campo_id,
      query.revision_detecciones,
    );
  }
```

- [ ] **Step 3: Refactorizar `findOne` para usar `assertInScope`**

Reemplazar:

```ts
  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
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
```

por:

```ts
  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    this.assertInScope(analysis, scope);
    return analysis;
  }
```

- [ ] **Step 4: Agregar los 4 endpoints nuevos y `assertInScope`**

Reemplazar:

```ts
    return result;
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
```

por:

```ts
    return result;
  }

  @ApiOperation({
    summary: 'Listar las detecciones de un análisis',
    description:
      'Devuelve las detecciones individuales del análisis con su estado actual ya resuelto (original del modelo, o la corrección más reciente si existe).',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @Get(':id/detections')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async listDetections(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    this.assertInScope(analysis, scope);
    return this.analysesService.listDetections(id);
  }

  @ApiOperation({
    summary: 'Agregar una detección que el modelo no detectó',
    description:
      'Crea una detección de origen humano (el agrónomo dibujó el bounding box en la pantalla de revisión).',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @Post(':id/detections')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async addDetection(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: CreateDetectionDto,
  ) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    this.assertInScope(analysis, scope);
    return this.analysesService.addDetection(id, req.user.sub, dto);
  }

  @ApiOperation({
    summary: 'Corregir o eliminar una detección',
    description:
      'Registra una corrección (EDITAR) o marca una detección como falso positivo (ELIMINAR). Append-only: no modifica la detección original.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiParam({ name: 'detectionId', type: String, format: 'uuid' })
  @Post(':id/detections/:detectionId/feedback')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async addDetectionFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('detectionId', ParseUUIDPipe) detectionId: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: DetectionFeedbackDto,
  ) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    this.assertInScope(analysis, scope);
    return this.analysesService.addFeedback(
      id,
      detectionId,
      req.user.sub,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Marcar un análisis como revisado',
    description:
      'Marca deteccionesRevisadas=true sin necesidad de haber registrado correcciones (caso: el agrónomo revisó y todo estaba correcto).',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @Patch(':id/review')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async markReviewed(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    this.assertInScope(analysis, scope);
    return this.analysesService.markReviewed(id, req.user.sub);
  }

  private assertInScope(
    analysis: { productorId: string; campoId: string | null },
    scope: UserScope,
  ) {
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
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
```

- [ ] **Step 5: Verificar que compila y correr la suite completa**

Run: `cd fruit-backend && pnpm run build && pnpm run test`
Expected: build sin errores; toda la suite de tests en verde (incluida `analyses.service.spec.ts` del Task 6).

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/analyses/analyses.controller.ts
git commit -m "feat(fruit-backend): exponer endpoints de detecciones y feedback en AnalysesController"
```

---

## Task 8: Tipos y hooks en `zarza-web`

**Files:**
- Create: `zarza-web/src/revision-detecciones/types.ts`
- Create: `zarza-web/src/revision-detecciones/useDetecciones.ts`

- [ ] **Step 1: Crear `types.ts`**

Create `zarza-web/src/revision-detecciones/types.ts`:

```ts
export const ETAPAS_CONOCIDAS = [
  'boton',
  'flor',
  'verde',
  'naranja',
  'marron',
  'maduro',
  'deteccion_gen',
] as const;

export type EtapaConocida = (typeof ETAPAS_CONOCIDAS)[number];

export type OrigenDeteccion = 'MODELO' | 'HUMANO';

export interface Deteccion {
  id: string;
  origen: OrigenDeteccion;
  confidence: number | null;
  etapa: string;
  sano: boolean;
  bbox: [number, number, number, number];
  eliminada: boolean;
}

export interface CreateDeteccionPayload {
  etapa: EtapaConocida;
  sano: boolean;
  bbox: [number, number, number, number];
}

export interface DeteccionFeedbackPayload {
  accion: 'EDITAR' | 'ELIMINAR';
  etapaCorregida?: EtapaConocida;
  saludCorregida?: boolean;
  bbox?: [number, number, number, number];
  observaciones?: string;
}
```

- [ ] **Step 2: Crear `useDetecciones.ts`**

Create `zarza-web/src/revision-detecciones/useDetecciones.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { AnalisisListResponse } from '../analisis/types';
import type {
  CreateDeteccionPayload,
  Deteccion,
  DeteccionFeedbackPayload,
} from './types';

export function useDetecciones(analysisId: string | null) {
  return useQuery<Deteccion[]>({
    queryKey: ['detecciones', analysisId],
    queryFn: () =>
      apiClient
        .get<Deteccion[]>(`/analyses/${analysisId}/detections`)
        .then((r) => r.data),
    enabled: !!analysisId,
  });
}

export function useAgregarDeteccion(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDeteccionPayload) =>
      apiClient
        .post<Deteccion>(`/analyses/${analysisId}/detections`, payload)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['detecciones', analysisId] }),
  });
}

export function useFeedbackDeteccion(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      detectionId,
      payload,
    }: {
      detectionId: string;
      payload: DeteccionFeedbackPayload;
    }) =>
      apiClient
        .post(
          `/analyses/${analysisId}/detections/${detectionId}/feedback`,
          payload,
        )
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['detecciones', analysisId] }),
  });
}

export function useMarcarRevisado(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.patch(`/analyses/${analysisId}/review`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['detecciones', analysisId] });
      qc.invalidateQueries({ queryKey: ['cola-revision'] });
    },
  });
}

export function useColaRevision(page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    revision_detecciones: 'pendiente',
  });
  return useQuery<AnalisisListResponse>({
    queryKey: ['cola-revision', page, limit],
    queryFn: () =>
      apiClient
        .get<AnalisisListResponse>(`/analyses?${params.toString()}`)
        .then((r) => r.data),
  });
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/revision-detecciones/types.ts zarza-web/src/revision-detecciones/useDetecciones.ts
git commit -m "feat(zarza-web): agregar tipos y hooks de revisión de detecciones"
```

---

## Task 9: Componente `DeteccionOverlay`

**Files:**
- Create: `zarza-web/src/revision-detecciones/DeteccionOverlay.tsx`

- [ ] **Step 1: Crear el componente**

Create `zarza-web/src/revision-detecciones/DeteccionOverlay.tsx`:

```tsx
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Deteccion } from './types';

interface Props {
  imageUrl: string;
  detecciones: Deteccion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  drawMode: boolean;
  onDrawComplete: (bbox: [number, number, number, number]) => void;
}

const ETAPA_COLOR: Record<string, string> = {
  boton: '#8c8c8c',
  flor: '#eb2f96',
  verde: '#52c41a',
  naranja: '#fa8c16',
  marron: '#8c5a2b',
  maduro: '#cf1322',
  deteccion_gen: '#1677ff',
};

export function DeteccionOverlay({
  imageUrl,
  detecciones,
  selectedId,
  onSelect,
  drawMode,
  onDrawComplete,
}: Props) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<[number, number, number, number] | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function toViewBoxPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!drawMode) return;
    const p = toViewBoxPoint(e.clientX, e.clientY);
    if (!p) return;
    startRef.current = p;
    setDraft([p.x, p.y, p.x, p.y]);
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drawMode || !startRef.current) return;
    const p = toViewBoxPoint(e.clientX, e.clientY);
    if (!p) return;
    const start = startRef.current;
    setDraft([
      Math.min(start.x, p.x),
      Math.min(start.y, p.y),
      Math.max(start.x, p.x),
      Math.max(start.y, p.y),
    ]);
  }

  function handlePointerUp() {
    if (!drawMode || !draft) return;
    const [x1, y1, x2, y2] = draft;
    if (x2 - x1 > 4 && y2 - y1 > 4) {
      onDrawComplete([
        Math.round(x1),
        Math.round(y1),
        Math.round(x2),
        Math.round(y2),
      ]);
    }
    startRef.current = null;
    setDraft(null);
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: naturalSize ? `${naturalSize.w} / ${naturalSize.h}` : undefined,
        background: '#f0f0f0',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <img
        src={imageUrl}
        alt="Análisis"
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
        onLoad={(e) =>
          setNaturalSize({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          })
        }
      />
      {naturalSize && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            cursor: drawMode ? 'crosshair' : 'default',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {detecciones.map((d) => {
            const [x1, y1, x2, y2] = d.bbox;
            const color = ETAPA_COLOR[d.etapa] ?? '#1677ff';
            return (
              <rect
                key={d.id}
                x={x1}
                y={y1}
                width={x2 - x1}
                height={y2 - y1}
                stroke={selectedId === d.id ? '#1677ff' : color}
                strokeWidth={selectedId === d.id ? 4 : 2}
                strokeDasharray={d.eliminada ? '6 4' : undefined}
                fill={!d.sano ? 'rgba(207,19,34,0.18)' : 'transparent'}
                opacity={d.eliminada ? 0.35 : 1}
                vectorEffect="non-scaling-stroke"
                onClick={() => onSelect(d.id)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
          {draft && (
            <rect
              x={draft[0]}
              y={draft[1]}
              width={draft[2] - draft[0]}
              height={draft[3] - draft[1]}
              stroke="#1677ff"
              strokeWidth={2}
              strokeDasharray="4 2"
              fill="rgba(22,119,255,0.1)"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/revision-detecciones/DeteccionOverlay.tsx
git commit -m "feat(zarza-web): agregar overlay SVG de bounding boxes con modo dibujo"
```

---

## Task 10: Componente `DeteccionPanel`

**Files:**
- Create: `zarza-web/src/revision-detecciones/DeteccionPanel.tsx`

- [ ] **Step 1: Crear el componente**

Create `zarza-web/src/revision-detecciones/DeteccionPanel.tsx`:

```tsx
import { useEffect } from 'react';
import { Form, Select, Switch, Button, Space, message } from 'antd';
import { useFeedbackDeteccion } from './useDetecciones';
import { ETAPAS_CONOCIDAS } from './types';
import type { Deteccion } from './types';

interface Props {
  deteccion: Deteccion;
  analysisId: string;
  onClose: () => void;
}

interface FormValues {
  etapa: (typeof ETAPAS_CONOCIDAS)[number];
  sano: boolean;
}

export function DeteccionPanel({ deteccion, analysisId, onClose }: Props) {
  const feedbackMutation = useFeedbackDeteccion(analysisId);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    form.setFieldsValue({
      etapa: deteccion.etapa as FormValues['etapa'],
      sano: deteccion.sano,
    });
  }, [deteccion, form]);

  async function guardar(values: FormValues) {
    try {
      await feedbackMutation.mutateAsync({
        detectionId: deteccion.id,
        payload: {
          accion: 'EDITAR',
          etapaCorregida: values.etapa,
          saludCorregida: values.sano,
        },
      });
      message.success('Corrección guardada');
    } catch {
      message.error('Error al guardar la corrección');
    }
  }

  async function eliminar() {
    try {
      await feedbackMutation.mutateAsync({
        detectionId: deteccion.id,
        payload: { accion: 'ELIMINAR' },
      });
      message.success('Detección eliminada');
      onClose();
    } catch {
      message.error('Error al eliminar la detección');
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        width: 280,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        padding: 16,
        zIndex: 10,
      }}
    >
      <Form form={form} layout="vertical" onFinish={guardar}>
        <Form.Item label="Etapa" name="etapa" rules={[{ required: true }]}>
          <Select options={ETAPAS_CONOCIDAS.map((e) => ({ value: e, label: e }))} />
        </Form.Item>
        <Form.Item label="Estado" name="sano" valuePropName="checked">
          <Switch checkedChildren="Sano" unCheckedChildren="Enfermo" />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={feedbackMutation.isPending}>
            Guardar
          </Button>
          <Button danger onClick={eliminar} loading={feedbackMutation.isPending}>
            Eliminar
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </Space>
      </Form>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/revision-detecciones/DeteccionPanel.tsx
git commit -m "feat(zarza-web): agregar panel de corrección de una detección"
```

---

## Task 11: Página `RevisionDeteccionesPage`

**Files:**
- Create: `zarza-web/src/revision-detecciones/RevisionDeteccionesPage.tsx`

- [ ] **Step 1: Crear la página**

Create `zarza-web/src/revision-detecciones/RevisionDeteccionesPage.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Select, Space, Switch, Typography, message } from 'antd';
import { useAnalisisDetail, useAnalisisImage } from '../analisis/useAnalisis';
import { useAgregarDeteccion, useDetecciones, useMarcarRevisado } from './useDetecciones';
import { DeteccionOverlay } from './DeteccionOverlay';
import { DeteccionPanel } from './DeteccionPanel';
import { ETAPAS_CONOCIDAS } from './types';
import type { EtapaConocida } from './types';

export function RevisionDeteccionesPage() {
  const { id } = useParams<{ id: string }>();
  const analysisId = id ?? null;
  const navigate = useNavigate();

  const imageQuery = useAnalisisImage(analysisId, !!analysisId);
  useAnalisisDetail(analysisId);
  const deteccionesQuery = useDetecciones(analysisId);
  const agregarMutation = useAgregarDeteccion(analysisId ?? '');
  const revisadoMutation = useMarcarRevisado(analysisId ?? '');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [draftEtapa, setDraftEtapa] = useState<EtapaConocida>('verde');
  const [draftSano, setDraftSano] = useState(true);

  const detecciones = deteccionesQuery.data ?? [];
  const selected = detecciones.find((d) => d.id === selectedId) ?? null;

  async function handleDrawComplete(bbox: [number, number, number, number]) {
    try {
      await agregarMutation.mutateAsync({ etapa: draftEtapa, sano: draftSano, bbox });
      message.success('Detección agregada');
      setDrawMode(false);
    } catch {
      message.error('Error al agregar la detección');
    }
  }

  async function handleMarcarRevisado() {
    try {
      await revisadoMutation.mutateAsync();
      message.success('Análisis marcado como revisado');
      navigate('/revision-detecciones');
    } catch {
      message.error('Error al marcar como revisado');
    }
  }

  if (!analysisId) return null;

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Revisión de detecciones
        </Typography.Title>
        <Space>
          <Select
            value={draftEtapa}
            onChange={setDraftEtapa}
            options={ETAPAS_CONOCIDAS.map((e) => ({ value: e, label: e }))}
            style={{ width: 140 }}
            disabled={!drawMode}
          />
          <Switch
            checked={draftSano}
            onChange={setDraftSano}
            checkedChildren="Sano"
            unCheckedChildren="Enfermo"
            disabled={!drawMode}
          />
          <Button type={drawMode ? 'primary' : 'default'} onClick={() => setDrawMode((v) => !v)}>
            {drawMode ? 'Cancelar dibujo' : '+ Agregar detección'}
          </Button>
          <Button type="primary" onClick={handleMarcarRevisado} loading={revisadoMutation.isPending}>
            Marcar como revisado
          </Button>
        </Space>
      </Space>

      {imageQuery.data?.url && (
        <DeteccionOverlay
          imageUrl={imageQuery.data.url}
          detecciones={detecciones}
          selectedId={selectedId}
          onSelect={setSelectedId}
          drawMode={drawMode}
          onDrawComplete={handleDrawComplete}
        />
      )}

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 16, paddingBottom: 8 }}>
        {detecciones.map((d) => (
          <div
            key={d.id}
            onClick={() => setSelectedId(d.id)}
            style={{
              minWidth: 140,
              padding: 8,
              borderRadius: 6,
              cursor: 'pointer',
              border: selectedId === d.id ? '2px solid #1677ff' : '1px solid #d9d9d9',
              opacity: d.eliminada ? 0.5 : 1,
            }}
          >
            <div>
              {d.etapa} · {d.sano ? 'sano' : 'enfermo'}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {d.origen === 'MODELO'
                ? `confianza ${((d.confidence ?? 0) * 100).toFixed(0)}%`
                : 'agregado manualmente'}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <DeteccionPanel
          deteccion={selected}
          analysisId={analysisId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/revision-detecciones/RevisionDeteccionesPage.tsx
git commit -m "feat(zarza-web): agregar pantalla de revisión de detecciones"
```

---

## Task 12: Página `ColaRevisionPage`

**Files:**
- Create: `zarza-web/src/revision-detecciones/ColaRevisionPage.tsx`

- [ ] **Step 1: Crear la página**

Create `zarza-web/src/revision-detecciones/ColaRevisionPage.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useColaRevision } from './useDetecciones';
import type { Analysis } from '../analisis/types';

export function ColaRevisionPage() {
  const [page, setPage] = useState(1);
  const query = useColaRevision(page);
  const navigate = useNavigate();

  const columns: ColumnsType<Analysis> = [
    {
      title: 'Campo',
      key: 'campo',
      render: (_: unknown, record: Analysis) =>
        record.campo ? `${record.campo.codigoCampo} — ${record.campo.nombre}` : record.campoId ?? '—',
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaAnalisis',
      render: (v: string | undefined) =>
        v ? new Date(v).toLocaleDateString('es-MX') : '—',
    },
    {
      title: 'Total detectados',
      dataIndex: 'totalElementosDetectados',
      render: (v: number | undefined) => v ?? '—',
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Analysis) => (
        <Button size="small" onClick={() => navigate(`/analisis/${record.id}/revision-detecciones`)}>
          Revisar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Cola de revisión de detecciones
      </Typography.Title>
      <Table
        rowKey="id"
        dataSource={query.data?.data ?? []}
        columns={columns}
        loading={query.isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/revision-detecciones/ColaRevisionPage.tsx
git commit -m "feat(zarza-web): agregar cola de análisis pendientes de revisión de detecciones"
```

---

## Task 13: Rutas, navegación y enlace desde el modal existente

**Files:**
- Modify: `zarza-web/src/App.tsx`
- Modify: `zarza-web/src/shared/AppShell.tsx`
- Modify: `zarza-web/src/analisis/AnalisisDetailModal.tsx`

- [ ] **Step 1: Agregar las rutas nuevas**

En `zarza-web/src/App.tsx`, reemplazar:

```tsx
import { AnalisisPage } from './analisis/AnalisisPage';
import { UsersPage } from './admin/UsersPage';
```

por:

```tsx
import { AnalisisPage } from './analisis/AnalisisPage';
import { ColaRevisionPage } from './revision-detecciones/ColaRevisionPage';
import { RevisionDeteccionesPage } from './revision-detecciones/RevisionDeteccionesPage';
import { UsersPage } from './admin/UsersPage';
```

Reemplazar:

```tsx
          <Route
            element={
              <PrivateRoute allowedRoles={[Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR]} />
            }
          >
            <Route path="/analisis" element={<AnalisisPage />} />
          </Route>
        </Route>
      </Route>
```

por:

```tsx
          <Route
            element={
              <PrivateRoute allowedRoles={[Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR]} />
            }
          >
            <Route path="/analisis" element={<AnalisisPage />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={[Role.ADMIN, Role.AGRONOMO]} />}>
            <Route path="/revision-detecciones" element={<ColaRevisionPage />} />
            <Route path="/analisis/:id/revision-detecciones" element={<RevisionDeteccionesPage />} />
          </Route>
        </Route>
      </Route>
```

- [ ] **Step 2: Agregar el enlace en el sidebar**

En `zarza-web/src/shared/AppShell.tsx`, reemplazar:

```tsx
const GROUP_CAMPO: NavItem[] = [
  { key: '/campos', label: 'Campos / Huertas', roles: [Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO] },
  { key: '/solicitudes', label: 'Solicitudes', roles: [Role.ADMIN, Role.AGRONOMO, Role.MONITOR] },
  { key: '/analisis', label: 'Revisión IA', roles: [Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR] },
];
```

por:

```tsx
const GROUP_CAMPO: NavItem[] = [
  { key: '/campos', label: 'Campos / Huertas', roles: [Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO] },
  { key: '/solicitudes', label: 'Solicitudes', roles: [Role.ADMIN, Role.AGRONOMO, Role.MONITOR] },
  { key: '/analisis', label: 'Revisión IA', roles: [Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR] },
  { key: '/revision-detecciones', label: 'Revisión de Detecciones', roles: [Role.ADMIN, Role.AGRONOMO] },
];
```

- [ ] **Step 3: Agregar el botón en `AnalisisDetailModal.tsx`**

En `zarza-web/src/analisis/AnalisisDetailModal.tsx`, reemplazar:

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
```

por:

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
```

Reemplazar:

```tsx
export function AnalisisDetailModal({ analysisId, open, onClose }: Props) {
  const { user } = useAuth();
  const canEdit = user?.role === Role.AGRONOMO || user?.role === Role.ADMIN;
  const isProductor = user?.role === Role.PRODUCTOR;

  const detailQuery = useAnalisisDetail(analysisId);
```

por:

```tsx
export function AnalisisDetailModal({ analysisId, open, onClose }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role === Role.AGRONOMO || user?.role === Role.ADMIN;
  const isProductor = user?.role === Role.PRODUCTOR;

  const detailQuery = useAnalisisDetail(analysisId);
```

Reemplazar:

```tsx
          <Row gutter={24}>
            <Col xs={24} md={10}>
              {isProductor ? (
```

por:

```tsx
          {canEdit && (
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button
                onClick={() => {
                  onClose();
                  navigate(`/analisis/${analysisId}/revision-detecciones`);
                }}
              >
                Revisar detecciones →
              </Button>
            </div>
          )}

          <Row gutter={24}>
            <Col xs={24} md={10}>
              {isProductor ? (
```

- [ ] **Step 4: Verificar que compila**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add zarza-web/src/App.tsx zarza-web/src/shared/AppShell.tsx zarza-web/src/analisis/AnalisisDetailModal.tsx
git commit -m "feat(zarza-web): enlazar la cola y la pantalla de revisión de detecciones"
```

---

## Task 14: Verificación manual end-to-end

**Files:** ninguno (solo verificación).

- [x] **Step 1: Levantar el stack completo**

Run: `docker compose up --build`
Expected: los 6 servicios (`postgres`, `rabbitmq`, `redis`, `fruit-backend`, `fruit-ms`, `fruit-inference`) arrancan sin error. Si se prefiere correr `zarza-web` fuera de Docker: `docker compose up postgres rabbitmq redis fruit-backend fruit-ms fruit-inference` y en otra terminal `cd zarza-web && npm run dev`.

Nota de verificación (2026-08-12): el stack ya estaba arriba con imágenes construidas el 2026-08-07/09, previas a casi todo este trabajo — `fruit-inference` no incluía el campo `detecciones`, por lo que las filas `Detection` no se persistían. Se reconstruyeron `fruit-backend`, `fruit-ms`, `fruit-inference` y `zarza-web` (`docker compose build` + `up -d`) antes de continuar.

- [x] **Step 2: Generar un análisis nuevo**

Subir una imagen vía la app o `POST /api/v1/ingestion/upload` y esperar a que `fruit-ms` termine de procesarla. Confirmar en los logs de `fruit-ms` que se registra `Análisis guardado` sin errores.

Verificado con `analysisId: 1500cfd7-5fdc-4057-88e2-7ced0e21c7c1` (campo E2E-1), 15 detecciones. Se encontró y corrigió un bug preexistente (no introducido por este plan, pero descubierto durante esta verificación): `MultipartImagePipe.transform` cortaba el loop de parsing en cuanto encontraba el part `file`, así que si `campoId`/`productorId` se enviaban *después* del archivo en el multipart, se ignoraban silenciosamente (el campo llegaba `null` y el mensaje terminaba en la DLQ tras 3 reintentos). Corregido en `fruit-backend/src/ingestion/pipes/multipart-image.pipe.ts`: el part de archivo ahora se bufferiza con `part.toBuffer()` en el momento en que se encuentra, permitiendo seguir consumiendo el iterador y capturar campos de metadata en cualquier orden. Reverificado end-to-end con `campoId`/`productorId` enviados después del archivo — el análisis se guardó en el primer intento.

- [x] **Step 3: Verificar en la base de datos que se crearon las `Detection`**

Run: `cd packages/database && pnpm run studio`
Expected: la tabla `detections` tiene una fila por cada fruto detectado en la imagen subida, con `origen = MODELO` y `confidence` poblado.

Verificado vía `psql` directo (usuario `rubus`/db `rubusai`): 15 filas para el análisis de prueba, todas `origen=MODELO` con `confidence` poblado.

- [x] **Step 4: Probar el flujo completo en el navegador como `AGRONOMO`**

1. Iniciar sesión como `AGRONOMO`.
2. Ir a "Revisión de Detecciones" en el sidebar → confirmar que el análisis recién creado aparece en la cola.
3. Hacer clic en "Revisar" → confirmar que la imagen carga con los bounding boxes superpuestos, coloreados por etapa.
4. Seleccionar una detección (clic en la caja o en la tarjeta) → confirmar que el panel de corrección se abre con la etapa/salud actuales precargadas.
5. Cambiar la etapa y guardar → confirmar `message.success` y que la caja cambia de color en la imagen.
6. Seleccionar otra detección y eliminarla → confirmar que la caja queda atenuada con borde punteado.
7. Activar "+ Agregar detección", elegir etapa/salud, y dibujar un rectángulo sobre un fruto no detectado → confirmar que aparece una nueva tarjeta "agregado manualmente".
8. Hacer clic en "Marcar como revisado" → confirmar que redirige a la cola y que el análisis ya no aparece en la lista de pendientes.

Los 8 pasos verificados con Claude in Chrome contra `http://localhost:5173`. El aparente recorte de las etiquetas "Sano"/"Enfermo" del `Switch` observado en la primera pasada era un artefacto de captura a mitad de la animación de antd (confirmado re-probando con espera antes del screenshot): el panel `DeteccionPanel` es `position: fixed` en la esquina inferior derecha, no depende de la posición del bbox seleccionado, y nunca se recorta contra el viewport.

- [x] **Step 5: Confirmar que `PRODUCTOR` no tiene acceso**

Iniciar sesión como `PRODUCTOR` → confirmar que "Revisión de Detecciones" no aparece en el sidebar, y que navegar manualmente a `/revision-detecciones` redirige a `/403`.

Verificado: el nav de `PRODUCTOR` no incluye el item, y la navegación directa redirige a `/403`.

- [x] **Step 6: Confirmar el scope de `AGRONOMO` por campo**

Con un `AGRONOMO` que tiene campos asignados, confirmar que la cola solo muestra análisis de sus campos, y que navegar directamente a la URL de revisión de un análisis fuera de su scope devuelve 404 (no carga la pantalla).

Verificado con un segundo campo/productor no asignado al agrónomo de prueba: la cola solo mostró el análisis del campo asignado, y los 3 endpoints (`/analyses/:id`, `/image`, `/detections`) devolvieron 404 al navegar directo a la URL de revisión del análisis fuera de scope.
