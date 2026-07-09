import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { StorageModule } from '../storage/storage.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MagicNumberValidator } from './validators/magic-number.validator';
import { MultipartImagePipe } from './pipes/multipart-image.pipe';
import { envs } from '../config/envs';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { fruitsQueueOptions } from '../config/rmq-queue-options';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    ClientsModule.register([
      {
        name: 'FRUITS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [envs.rabbitmqUrl],
          queue: envs.rabbitmqQueue,
          // Mensajes persistentes: la cola es durable, sin esto un reinicio
          // del broker pierde los eventos nueva_fruta encolados.
          persistent: true,
          queueOptions: fruitsQueueOptions,
        },
      },
    ]),
  ],
  controllers: [IngestionController],
  providers: [IngestionService, MagicNumberValidator, MultipartImagePipe],
})
export class IngestionModule {}
