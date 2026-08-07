import { Module } from '@nestjs/common';
import { FruitsModule } from './fruits/fruits.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { LoggerModule } from 'nestjs-pino';
import { envs } from './config/envs';
import { LoggingModule } from './common/logging/logging.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: envs.logLevel,
        autoLogging: false,
        base: {
          service: 'fruit-ms',
        },
        messageKey: 'message',
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,

        formatters: {
          level(label) {
            return { level: label.toUpperCase() };
          },
        },
      },
    }),
    LoggingModule,
    DatabaseModule,
    FruitsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
