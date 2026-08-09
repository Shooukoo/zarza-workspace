import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InvalidCredentialsError } from '../domain/errors/auth.errors';
import { Role } from '../domain/enums/role.enum';
import { User } from '../domain/entities/user.entity';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const mockUserRepo = {
  findByEmail: jest.fn(),
  save: jest.fn(),
  findById: jest.fn(),
  findUserById: jest.fn(),
  findFcmTokenById: jest.fn(),
  clearFcmToken: jest.fn(),
  saveFcmToken: jest.fn(),
  updateProfile: jest.fn(),
};

const mockHasher = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockTokenService = {
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
};

const mockRefreshRepo = {
  create: jest.fn(),
  findByTokenHash: jest.fn(),
  revokeByTokenHash: jest.fn(),
  revokeByFamilyId: jest.fn(),
  deleteExpired: jest.fn(),
};

function makeUser(overrides: Partial<User> = {}): User {
  return new User(
    overrides.id ?? 'user-1',
    overrides.email ?? 'test@example.com',
    'hashed-pw',
    (overrides.role as Role) ?? Role.PRODUCTOR,
    overrides.firstName ?? null,
    overrides.lastName ?? null,
  );
}

function makeService(): AuthService {
  return new AuthService(
    mockUserRepo,
    mockHasher,
    mockTokenService,
    mockRefreshRepo,
    SEVEN_DAYS_MS,
  );
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
  });

  describe('login()', () => {
    it('devuelve token, refreshToken y user al autenticar correctamente', async () => {
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockHasher.compare.mockResolvedValue(true);
      mockTokenService.generateToken.mockResolvedValue('access-jwt');
      mockRefreshRepo.create.mockResolvedValue(undefined);

      const result = await service.login('test@example.com', 'password');

      expect(result.token).toBe('access-jwt');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
      expect(result.user.email).toBe('test@example.com');
    });

    it('persiste el hash del refresh token en la BD (nunca el token en claro)', async () => {
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockHasher.compare.mockResolvedValue(true);
      mockTokenService.generateToken.mockResolvedValue('access-jwt');
      mockRefreshRepo.create.mockResolvedValue(undefined);

      const result = await service.login('test@example.com', 'password');

      expect(mockRefreshRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          expiresAt: expect.any(Date),
          familyId: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
          ),
        }),
      );
      // El hash almacenado NO debe ser igual al token en claro
      const storedHash = mockRefreshRepo.create.mock.calls[0][0].tokenHash;
      expect(storedHash).not.toBe(result.refreshToken);
      expect(storedHash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    });

    it('lanza InvalidCredentialsError si el usuario no existe', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      await expect(service.login('no@user.com', 'pw')).rejects.toThrow(
        InvalidCredentialsError,
      );
    });

    it('lanza InvalidCredentialsError si la contraseña es incorrecta', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser());
      mockHasher.compare.mockResolvedValue(false);
      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(
        InvalidCredentialsError,
      );
    });
  });

  describe('refresh()', () => {
    const FAMILY_ID = 'family-uuid-1';

    it('rota el token correctamente: revoca el actual, emite nuevos con el mismo familyId', async () => {
      const user = makeUser();
      const futureDate = new Date(Date.now() + 60_000);

      mockRefreshRepo.findByTokenHash.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'some-hash',
        userId: 'user-1',
        familyId: FAMILY_ID,
        expiresAt: futureDate,
        revokedAt: null,
      });
      mockRefreshRepo.revokeByTokenHash.mockResolvedValue(true);
      mockUserRepo.findUserById.mockResolvedValue(user);
      mockTokenService.generateToken.mockResolvedValue('new-access-jwt');
      mockRefreshRepo.create.mockResolvedValue(undefined);

      const result = await service.refresh('raw-refresh-token');

      expect(result.token).toBe('new-access-jwt');
      expect(result.refreshToken).toBeDefined();
      expect(mockRefreshRepo.revokeByTokenHash).toHaveBeenCalledTimes(1);
      // El nuevo token debe tener el mismo familyId
      expect(mockRefreshRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: FAMILY_ID }),
      );
    });

    it('detecta robo por carrera: revoca toda la familia si revokeByTokenHash pierde la carrera', async () => {
      mockRefreshRepo.findByTokenHash.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'some-hash',
        userId: 'user-1',
        familyId: FAMILY_ID,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });
      mockRefreshRepo.revokeByTokenHash.mockResolvedValue(false);
      mockRefreshRepo.revokeByFamilyId.mockResolvedValue(undefined);

      await expect(service.refresh('raced-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshRepo.revokeByFamilyId).toHaveBeenCalledWith(FAMILY_ID);
    });

    it('detecta robo: revoca toda la familia si el token ya estaba revocado', async () => {
      mockRefreshRepo.findByTokenHash.mockResolvedValue({
        id: 'rt-old',
        tokenHash: 'old-hash',
        userId: 'user-1',
        familyId: FAMILY_ID,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(), // ya revocado
      });
      mockRefreshRepo.revokeByFamilyId.mockResolvedValue(undefined);

      await expect(service.refresh('stolen-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshRepo.revokeByFamilyId).toHaveBeenCalledWith(FAMILY_ID);
    });

    it('lanza 401 si el token no existe en la BD', async () => {
      mockRefreshRepo.findByTokenHash.mockResolvedValue(null);
      await expect(service.refresh('fake-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza 401 si el token está expirado', async () => {
      mockRefreshRepo.findByTokenHash.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash',
        userId: 'user-1',
        familyId: FAMILY_ID,
        expiresAt: new Date(Date.now() - 1000), // expirado
        revokedAt: null,
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout()', () => {
    it('revoca el refresh token en la BD', async () => {
      mockRefreshRepo.revokeByTokenHash.mockResolvedValue(true);

      await service.logout('some-refresh-token');

      expect(mockRefreshRepo.revokeByTokenHash).toHaveBeenCalledTimes(1);
    });

    it('no lanza error si rawToken es undefined', async () => {
      await expect(service.logout(undefined)).resolves.not.toThrow();
      expect(mockRefreshRepo.revokeByTokenHash).not.toHaveBeenCalled();
    });
  });

  describe('getProfile()', () => {
    it('devuelve el perfil completo (incluye firstName/lastName) para un userId existente', async () => {
      const user = makeUser({ firstName: 'Ana', lastName: 'Pérez' });
      mockUserRepo.findUserById.mockResolvedValue(user);

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        role: Role.PRODUCTOR,
        firstName: 'Ana',
        lastName: 'Pérez',
      });
      expect(mockUserRepo.findUserById).toHaveBeenCalledWith('user-1');
    });

    it('lanza 401 si el userId no corresponde a ningún usuario', async () => {
      mockUserRepo.findUserById.mockResolvedValue(null);

      await expect(service.getProfile('missing-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
