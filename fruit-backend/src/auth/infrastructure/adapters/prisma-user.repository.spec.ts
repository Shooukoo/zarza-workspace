import { randomBytes } from 'crypto';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@rubus/database';
import { PrismaUserRepository } from './prisma-user.repository';
import { I_CRYPTO_PORT } from '../../ports/crypto.port';
import { AesGcmCrypto } from './aes-gcm-crypto.adapter';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('PrismaUserRepository — cifrado de fcmToken', () => {
  let repo: PrismaUserRepository;

  beforeEach(async () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        PrismaUserRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: I_CRYPTO_PORT, useClass: AesGcmCrypto },
      ],
    }).compile();
    repo = module.get(PrismaUserRepository);
  });

  it('saveFcmToken persiste el token cifrado, no en texto plano', async () => {
    mockPrisma.user.update.mockResolvedValue({});

    await repo.saveFcmToken('user-1', 'raw-fcm-token');

    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'user-1' });
    expect(call.data.fcmToken).not.toBe('raw-fcm-token');
    expect((call.data.fcmToken as string).startsWith('v1:')).toBe(true);
  });

  it('findFcmTokenById desencripta un token guardado cifrado', async () => {
    mockPrisma.user.update.mockResolvedValue({});
    await repo.saveFcmToken('user-1', 'raw-fcm-token');
    const encrypted = mockPrisma.user.update.mock.calls[0][0].data.fcmToken;
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: encrypted });

    const result = await repo.findFcmTokenById('user-1');

    expect(result).toBe('raw-fcm-token');
  });

  it('findFcmTokenById devuelve un token legado en texto plano tal cual', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      fcmToken: 'token-legado-plano',
    });

    const result = await repo.findFcmTokenById('user-1');

    expect(result).toBe('token-legado-plano');
  });

  it('findFcmTokenById devuelve null si el usuario no tiene token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: null });

    expect(await repo.findFcmTokenById('user-1')).toBeNull();
  });

  describe('updatePassword()', () => {
    it('actualiza passwordHash del usuario indicado', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await repo.updatePassword('user-1', 'new-hashed-value');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'new-hashed-value' },
      });
    });
  });
});
