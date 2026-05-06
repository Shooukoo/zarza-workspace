import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { FruitsQueryController } from './fruits-query.controller';
import { FruitsQueryService } from './fruits-query.service';
import { envs } from '../config/envs';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [
    AuthModule,
    ClientsModule.register([
      {
        name: 'FRUITS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [envs.rabbitmqUrl],
          queue: envs.rabbitmqQueue,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [FruitsQueryController],
  providers: [FruitsQueryService],
})
export class FruitsQueryModule {}
