import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import {
  deadLetterQueueArguments,
  setupDeadLetterTopology,
} from './config/rabbitmq-topology';

async function bootstrap() {
  // App híbrida: consumidor RMQ + listener HTTP mínimo para healthcheck Docker
  const app = await NestFactory.create(AppModule);

  // La topología DLX debe existir antes de que Nest declare la cola principal
  // con argumentos que apuntan a ella.
  await setupDeadLetterTopology(envs.rabbitmqUrl, envs.rabbitmqQueue);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [envs.rabbitmqUrl],
        queue: envs.rabbitmqQueue,
        // Ack manual: el controller decide ack (éxito) o nack → DLQ (agotados
        // los reintentos). prefetchCount > 1 evita que un mensaje en backoff
        // bloquee los request-reply get_fruits/get_fruit_by_id de la misma cola.
        noAck: false,
        prefetchCount: 5,
        queueOptions: {
          durable: true,
          arguments: deadLetterQueueArguments(envs.rabbitmqQueue),
        },
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
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
