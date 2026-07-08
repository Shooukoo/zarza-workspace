import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { envs } from './config/envs';

async function bootstrap() {
  // App híbrida: consumidor RMQ + listener HTTP mínimo para healthcheck Docker
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [envs.rabbitmqUrl],
        queue: envs.rabbitmqQueue,
        queueOptions: { durable: true },
      },
    },
    { inheritAppConfig: true },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.startAllMicroservices();
  await app.listen(envs.healthPort, '0.0.0.0');
  console.log(`fruit-ms listening on RabbitMQ queue: ${envs.rabbitmqQueue}`);
  console.log(`fruit-ms health endpoint on port ${envs.healthPort}`);
}
bootstrap();

