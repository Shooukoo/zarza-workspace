/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;

  // Cloudflare R2
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;

  // RabbitMQ
  RABBITMQ_URL: string;
  RABBITMQ_QUEUE: string;
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
  })
  .unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,

  // Cloudflare R2
  r2Endpoint: envVars.R2_ENDPOINT,
  r2AccessKeyId: envVars.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: envVars.R2_SECRET_ACCESS_KEY,
  r2BucketName: envVars.R2_BUCKET_NAME,

  // RabbitMQ
  rabbitmqUrl: envVars.RABBITMQ_URL,
  rabbitmqQueue: envVars.RABBITMQ_QUEUE,
};

