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
