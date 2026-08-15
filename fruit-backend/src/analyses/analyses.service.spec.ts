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

    it('no marca deteccionesRevisadas — solo el endpoint explícito de revisión puede hacerlo', async () => {
      prisma.analysis.findUnique.mockResolvedValue({ id: 'analysis-1', fenologiaEtapas: [], campo: null, deteccionesRevisadas: false });
      prisma.detection.create.mockResolvedValue({
        id: 'det-2', origen: 'HUMANO', confidence: null,
        etapaDetectada: 'verde', saludDetectada: 'SANO',
        bboxX1: 10, bboxY1: 20, bboxX2: 30, bboxY2: 40,
      });

      await service.addDetection('analysis-1', 'user-1', { etapa: 'verde', sano: true, bbox: [10, 20, 30, 40] });

      expect(prisma.analysis.update).not.toHaveBeenCalled();
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
      expect(prisma.analysis.update).not.toHaveBeenCalled();
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
