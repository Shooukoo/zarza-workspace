import { Module } from '@nestjs/common';
import { FruitsModule } from './fruits/fruits.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        autoLogging: false,
        messageKey: 'message',
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,

        formatters: {
          bindings() {
            return {};
          },
          level(label) {
            return {level: label.toUpperCase(),};
          },
        },

      },
    }),
    DatabaseModule, FruitsModule],
  controllers: [HealthController],
})
export class AppModule {}

