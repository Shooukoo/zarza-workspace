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
