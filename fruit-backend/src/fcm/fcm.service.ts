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
    this.logger.log(`[FCM] Enviando push → title="${notification.title}"`);
    try {
      const msgId = await admin.messaging().send({
        token: fcmToken,
        // Data-only: el OS nunca auto-muestra nada; onBackgroundMessage lo maneja
        data: { title: notification.title, body: notification.body },
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
      });
      this.logger.log(`[FCM] Push enviado OK → messageId=${msgId}`);
    } catch (error: any) {
      const code: string = error?.errorInfo?.code ?? error?.code ?? '';
      this.logger.error(`[FCM] Error al enviar push: code=${code} msg=${error?.message ?? error}`);
      if (code === 'messaging/registration-token-not-registered') {
        throw new FcmTokenInvalidError(fcmToken);
      }
    }
  }
}
