// Tests herméticos: no dependen del .env del desarrollador (envs.ts valida estas variables al importarse).
process.env.TRAINING_URL = 'http://localhost:8001';
process.env.INFERENCE_URL = 'http://localhost:8000';
process.env.TRAINING_MIN_REVIEWED_ANALYSES = '50';

// Resto de variables obligatorias: valores falsos solo si no hay .env ni entorno que las defina.
process.env.PORT ??= '3000';
process.env.R2_ENDPOINT ??= 'https://example.invalid';
process.env.R2_ACCESS_KEY_ID ??= 'test';
process.env.R2_SECRET_ACCESS_KEY ??= 'test';
process.env.R2_BUCKET_NAME ??= 'test';
process.env.RABBITMQ_URL ??= 'amqp://guest:guest@localhost:5672';
process.env.RABBITMQ_QUEUE ??= 'test_queue';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.JWT_ACCESS_EXPIRES_IN ??= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';
process.env.FIREBASE_SERVICE_ACCOUNT_B64 ??= 'dGVzdA==';
process.env.INTERNAL_NOTIFY_TOKEN ??= 'x'.repeat(32);
process.env.FCM_TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32).toString('base64');
process.env.TRAINING_INTERNAL_TOKEN ??= 'y'.repeat(32);
process.env.INFERENCE_AUTH_TOKEN ??= 'test';
