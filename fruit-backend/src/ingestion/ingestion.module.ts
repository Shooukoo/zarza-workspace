import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { StorageModule } from '../storage/storage.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MagicNumberValidator } from './validators/magic-number.validator';
import { MultipartImagePipe } from './pipes/multipart-image.pipe';
import { envs } from '../config/envs';
import { AuthModule } from '../auth/infrastructure/auth.module';

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
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [IngestionController],
  providers: [IngestionService, MagicNumberValidator, MultipartImagePipe],
})
export class IngestionModule {}
