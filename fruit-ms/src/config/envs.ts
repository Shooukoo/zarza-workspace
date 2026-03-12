/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  RABBITMQ_URL:   string;
  RABBITMQ_QUEUE: string;
  INFERENCE_URL:  string;
  MONGO_URI:      string;
}

// Acepta tanto mongodb:// (local/Docker) como mongodb+srv:// (Atlas)
const MONGO_URI_REGEX = /^mongodb(?:\+srv)?:\/\/.+/;

const envSchema = joi
  .object({
    RABBITMQ_URL:   joi.string().required(),
    RABBITMQ_QUEUE: joi.string().required(),
    INFERENCE_URL:  joi.string().uri().required(),
    MONGO_URI:      joi.string().pattern(MONGO_URI_REGEX).required(),
  })
  .unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  rabbitmqUrl:   envVars.RABBITMQ_URL,
  rabbitmqQueue: envVars.RABBITMQ_QUEUE,
  inferenceUrl:  envVars.INFERENCE_URL,
  mongoUri:      envVars.MONGO_URI,
};
