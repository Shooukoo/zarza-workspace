/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;

  // MongoDB
  MONGO_URI: string;

  // Cloudflare R2
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;

  // RabbitMQ
  RABBITMQ_URL: string;
  RABBITMQ_QUEUE: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

const envSchema = joi
  .object({
    PORT: joi.number().required(),

    MONGO_URI: joi.string().uri().required(),

    R2_ENDPOINT: joi.string().uri().required(),
    R2_ACCESS_KEY_ID: joi.string().required(),
    R2_SECRET_ACCESS_KEY: joi.string().required(),
    R2_BUCKET_NAME: joi.string().required(),

    RABBITMQ_URL: joi.string().required(),
    RABBITMQ_QUEUE: joi.string().required(),

    JWT_SECRET: joi.string().required(),
    JWT_EXPIRES_IN: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,

  // MongoDB
  mongoUri: envVars.MONGO_URI,

  // Cloudflare R2
  r2Endpoint: envVars.R2_ENDPOINT,
  r2AccessKeyId: envVars.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: envVars.R2_SECRET_ACCESS_KEY,
  r2BucketName: envVars.R2_BUCKET_NAME,

  // RabbitMQ
  rabbitmqUrl: envVars.RABBITMQ_URL,
  rabbitmqQueue: envVars.RABBITMQ_QUEUE,

  // JWT
  jwtSecret: envVars.JWT_SECRET,
  jwtExpiresIn: envVars.JWT_EXPIRES_IN,
};

