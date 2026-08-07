import { AdminService } from './admin.service';
import { PrismaService } from '@rubus/database';
import { RedisCacheService } from '../cache/redis-cache.service';
import { Role } from '../auth/domain/enums/role.enum';
import type { IHasherPort } from '../auth/ports/hasher.port';

describe('AdminService — cache de stats', () => {
  let prisma: {
    user: {
      groupBy: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let cache: { getOrSet: jest.Mock; invalidatePrefix: jest.Mock };
  let hasher: IHasherPort;
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      user: {
        groupBy: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
    };
    cache = {
      getOrSet: jest.fn(
        (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
      ),
      invalidatePrefix: jest.fn().mockResolvedValue(undefined),
    };
    hasher = {
      hash: jest.fn().mockResolvedValue('hashed'),
      compare: jest.fn(),
    };
    service = new AdminService(
      prisma as unknown as PrismaService,
      hasher,
      cache as unknown as RedisCacheService,
    );
  });

  describe('getStats()', () => {
    it('envuelve el cómputo con la clave admin:stats y TTL 300', async () => {
      prisma.user.groupBy.mockResolvedValue([
        { role: 'ADMIN', _count: { id: 1 } },
        { role: 'PRODUCTOR', _count: { id: 4 } },
      ]);

      const result = await service.getStats();

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'admin:stats',
        300,
        expect.any(Function),
      );
      expect(result.totalUsers).toBe(5);
      expect(result.usersByRole.PRODUCTOR).toBe(4);
    });
  });

  describe('findMonitores()', () => {
    it('consulta usuarios con role MONITOR y devuelve solo campos mínimos', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'm1', email: 'monitor1@b.c', firstName: 'Ana', lastName: 'Ruiz' },
        { id: 'm2', email: 'monitor2@b.c', firstName: null, lastName: null },
      ]);

      const result = await service.findMonitores();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'MONITOR' },
        select: { id: true, email: true, firstName: true, lastName: true },
        orderBy: { email: 'asc' },
      });
      expect(result).toEqual([
        { id: 'm1', email: 'monitor1@b.c', firstName: 'Ana', lastName: 'Ruiz' },
        { id: 'm2', email: 'monitor2@b.c', firstName: null, lastName: null },
      ]);
    });
  });

  describe('invalidación de admin:stats', () => {
    it('updateUserRole invalida tras actualizar', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        role: 'AGRONOMO',
        createdAt: new Date(),
      });

      await service.updateUserRole('u1', Role.AGRONOMO);

      expect(cache.invalidatePrefix).toHaveBeenCalledWith('admin:stats');
    });

    it('createUser invalida tras crear', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'u2',
        email: 'nuevo@b.c',
        role: 'PRODUCTOR',
        firstName: null,
        lastName: null,
        createdAt: new Date(),
      });

      await service.createUser('nuevo@b.c', 'secret123', Role.PRODUCTOR);

      expect(cache.invalidatePrefix).toHaveBeenCalledWith('admin:stats');
    });

    it('deleteUser invalida tras borrar', async () => {
      await service.deleteUser('u3', 'admin-1');

      expect(cache.invalidatePrefix).toHaveBeenCalledWith('admin:stats');
    });

    it('deleteUser NO invalida si el borrado es rechazado (auto-borrado)', async () => {
      await expect(service.deleteUser('admin-1', 'admin-1')).rejects.toThrow();

      expect(cache.invalidatePrefix).not.toHaveBeenCalled();
    });
  });
});
