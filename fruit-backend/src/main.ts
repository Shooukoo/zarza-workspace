import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { envs } from './config/envs';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Zarza API')
    .setDescription('API documentation for Zarza backend')
    .setVersion('1.0')
    .addServer('/api/v1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
  });

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.register(helmet as any);
  await app.register(cookie as any);

  const corsOrigins = envs.corsOrigin.split(',').map((s) => s.trim());

  await app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  });

  app.useWebSocketAdapter(new WsAdapter(app));

  await app.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1000000,
      fields: 10,
      fileSize: 5000000,
      files: 1,
      headerPairs: 2000,
    },
  });

  await app.listen(envs.port, '0.0.0.0');
  const logger = app.get(Logger);
  logger.log(`App running on port ${envs.port}`);
}
bootstrap();
