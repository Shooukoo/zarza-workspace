jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn().mockReturnValue({}) },
  messaging: jest.fn(),
}));

import * as admin from 'firebase-admin';
import {
  FcmService,
  FcmTokenInvalidError,
  FcmNotification,
} from './fcm.service';
import { AppLogger } from '../common/logging/app.logger';

const VALID_B64 = Buffer.from(
  JSON.stringify({ type: 'service_account' }),
).toString('base64');

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

function buildService(): FcmService {
  return new FcmService(mockLogger as AppLogger);
}

describe('FcmService', () => {
  let service: FcmService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    process.env.FIREBASE_SERVICE_ACCOUNT_B64 = VALID_B64;
    mockSend = jest.fn();
    (admin.messaging as jest.Mock).mockReturnValue({ send: mockSend });
    service = buildService();
    service.onModuleInit();
  });

  afterEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('throws if FIREBASE_SERVICE_ACCOUNT_B64 is absent', () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
      const svc = buildService();
      expect(() => svc.onModuleInit()).toThrow('FIREBASE_SERVICE_ACCOUNT_B64');
    });

    it('initializes Firebase app with parsed credentials', () => {
      expect(admin.initializeApp).toHaveBeenCalledWith({
        credential: expect.anything(),
      });
    });
  });

  describe('sendToDevice', () => {
    const notification: FcmNotification = { title: 'Test', body: 'Cuerpo' };

    it('calls messaging().send with correct token and notification', async () => {
      mockSend.mockResolvedValue('msg-id');
      await service.sendToDevice('token-abc', notification);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'token-abc',
          data: {
            title: 'Test',
            body: 'Cuerpo',
          },
        }),
      );
    });

    it('throws FcmTokenInvalidError when Firebase returns registration-token-not-registered', async () => {
      mockSend.mockRejectedValue({
        errorInfo: { code: 'messaging/registration-token-not-registered' },
      });
      await expect(
        service.sendToDevice('bad-token', notification),
      ).rejects.toThrow(FcmTokenInvalidError);
    });

    it('does NOT throw for other Firebase errors (swallows them)', async () => {
      mockSend.mockRejectedValue(new Error('quota exceeded'));
      await expect(
        service.sendToDevice('token-abc', notification),
      ).resolves.toBeUndefined();
    });
  });
});
