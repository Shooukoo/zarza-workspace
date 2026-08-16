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
