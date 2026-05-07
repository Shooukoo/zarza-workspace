import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface FcmNotification {
  title: string;
  body: string;
}

export class FcmTokenInvalidError extends Error {
  constructor(public readonly token: string) {
    super(`FCM token invalid: ${token}`);
    this.name = 'FcmTokenInvalidError';
  }
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  onModuleInit(): void {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 env var is required');
    }
    const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }

  async sendToDevice(fcmToken: string, notification: FcmNotification): Promise<void> {
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title: notification.title, body: notification.body },
      });
    } catch (error: any) {
      const code: string = error?.errorInfo?.code ?? error?.code ?? '';
      if (code === 'messaging/registration-token-not-registered') {
        throw new FcmTokenInvalidError(fcmToken);
      }
      this.logger.error(`[FCM] Error enviando push: ${error?.message ?? error}`);
    }
  }
}
