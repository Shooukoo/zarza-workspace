/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  RABBITMQ_URL: string;
  RABBITMQ_QUEUE: string;
  INFERENCE_URL: string;
  INFERENCE_AUTH_TOKEN: string;
  DATABASE_URL: string;
  BACKEND_URL: string;
  INTERNAL_NOTIFY_TOKEN: string;
  HEALTH_PORT: number;
  NUEVA_FRUTA_MAX_ATTEMPTS: number;
  NUEVA_FRUTA_BACKOFF_BASE_MS: number;
}

const envSchema = joi
  .object({
    RABBITMQ_URL: joi.string().required(),
    RABBITMQ_QUEUE: joi.string().required(),
    INFERENCE_URL: joi.string().uri().required(),
    INFERENCE_AUTH_TOKEN: joi.string().required(),
    DATABASE_URL: joi.string().required(),
    BACKEND_URL: joi.string().uri().default('http://fruit-backend:3000'),
    INTERNAL_NOTIFY_TOKEN: joi.string().min(32).required(),
    HEALTH_PORT: joi.number().default(3002),
    NUEVA_FRUTA_MAX_ATTEMPTS: joi.number().integer().min(1).default(3),
    NUEVA_FRUTA_BACKOFF_BASE_MS: joi.number().integer().min(0).default(2000),
  })
  .unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  rabbitmqUrl: envVars.RABBITMQ_URL,
  rabbitmqQueue: envVars.RABBITMQ_QUEUE,
  inferenceUrl: envVars.INFERENCE_URL,
  inferenceAuthToken: envVars.INFERENCE_AUTH_TOKEN,
  backendUrl: envVars.BACKEND_URL,
  internalNotifyToken: envVars.INTERNAL_NOTIFY_TOKEN,
  healthPort: envVars.HEALTH_PORT,
  nuevaFrutaMaxAttempts: envVars.NUEVA_FRUTA_MAX_ATTEMPTS,
  nuevaFrutaBackoffBaseMs: envVars.NUEVA_FRUTA_BACKOFF_BASE_MS,
};
