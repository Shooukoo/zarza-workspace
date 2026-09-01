import { Test } from '@nestjs/testing';
import { PrismaService } from '@rubus/database';
import { PrismaRefreshTokenRepository } from './prisma-refresh-token.repository';

const mockPrisma = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('PrismaRefreshTokenRepository', () => {
  let repo: PrismaRefreshTokenRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PrismaRefreshTokenRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    repo = module.get(PrismaRefreshTokenRepository);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('persiste el registro en prisma.refreshToken', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});
      const params = {
        tokenHash: 'abc123',
        userId: 'user-1',
        familyId: 'family-1',
        expiresAt: new Date('2099-01-01'),
      };

      await repo.create(params);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: params,
      });
    });
  });

  describe('findByTokenHash()', () => {
    it('devuelve el registro si existe', async () => {
      const record = {
        id: 'rt-1',
        tokenHash: 'abc',
        userId: 'u1',
        familyId: 'f1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      };
      mockPrisma.refreshToken.findUnique.mockResolvedValue(record);

      const result = await repo.findByTokenHash('abc');

      expect(result).toEqual(record);
      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: 'abc' },
      });
    });

    it('devuelve null si no existe', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      expect(await repo.findByTokenHash('nope')).toBeNull();
    });
  });

  describe('revokeByTokenHash()', () => {
    it('revoca el token activo y devuelve true', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await repo.revokeByTokenHash('abc123');

      expect(result).toBe(true);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: 'abc123', revokedAt: null },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('devuelve false si el token ya estaba revocado (perdió la carrera)', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      const result = await repo.revokeByTokenHash('abc123');

      expect(result).toBe(false);
    });
  });

  describe('revokeByFamilyId()', () => {
    it('marca como revocados todos los tokens activos de la familia', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await repo.revokeByFamilyId('family-1');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revokeAllByUserId()', () => {
    it('revoca todos los tokens activos del usuario cuando no se excluye ninguna familia', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await repo.revokeAllByUserId('user-1');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('excluye la familia indicada al revocar', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await repo.revokeAllByUserId('user-1', 'family-actual');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          revokedAt: null,
          familyId: { not: 'family-actual' },
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteExpired()', () => {
    it('elimina registros con expiresAt en el pasado y devuelve el conteo', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      const count = await repo.deleteExpired();

      expect(count).toBe(5);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });
});
