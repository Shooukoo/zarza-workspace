/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  RABBITMQ_URL: string;
  RABBITMQ_QUEUE: string;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  FIREBASE_SERVICE_ACCOUNT_B64: string;
  INTERNAL_NOTIFY_TOKEN: string;
  FCM_TOKEN_ENCRYPTION_KEY: string;
  LOG_LEVEL: string;
}

const envSchema = joi
  .object({
    PORT: joi.number().required(),
    R2_ENDPOINT: joi.string().uri().required(),
    R2_ACCESS_KEY_ID: joi.string().required(),
    R2_SECRET_ACCESS_KEY: joi.string().required(),
    R2_BUCKET_NAME: joi.string().required(),
    RABBITMQ_URL: joi.string().required(),
    RABBITMQ_QUEUE: joi.string().required(),
    JWT_SECRET: joi.string().required(),
    JWT_ACCESS_EXPIRES_IN: joi.string().required(),
    JWT_REFRESH_EXPIRES_IN: joi.string().required(),
    CORS_ORIGIN: joi.string().optional().default('http://localhost:5173'),
    FIREBASE_SERVICE_ACCOUNT_B64: joi.string().required(),
    INTERNAL_NOTIFY_TOKEN: joi.string().min(32).required(),
    FCM_TOKEN_ENCRYPTION_KEY: joi
      .string()
      .required()
      .custom((value: string, helpers: joi.CustomHelpers) => {
        if (Buffer.from(value, 'base64').length !== 32) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'clave base64 de 32 bytes'),
    LOG_LEVEL: joi
      .string()
      .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
      .default('info'),
  })
  .unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  r2Endpoint: envVars.R2_ENDPOINT,
  r2AccessKeyId: envVars.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: envVars.R2_SECRET_ACCESS_KEY,
  r2BucketName: envVars.R2_BUCKET_NAME,
  rabbitmqUrl: envVars.RABBITMQ_URL,
  rabbitmqQueue: envVars.RABBITMQ_QUEUE,
  jwtSecret: envVars.JWT_SECRET,
  jwtAccessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  corsOrigin: envVars.CORS_ORIGIN,
  firebaseServiceAccountB64: envVars.FIREBASE_SERVICE_ACCOUNT_B64,
  internalNotifyToken: envVars.INTERNAL_NOTIFY_TOKEN,
  fcmTokenEncryptionKey: envVars.FCM_TOKEN_ENCRYPTION_KEY,
  logLevel: envVars.LOG_LEVEL,
};
