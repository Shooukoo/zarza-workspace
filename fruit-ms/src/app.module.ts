import { Module } from '@nestjs/common';
import { FruitsModule } from './fruits/fruits.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [DatabaseModule, FruitsModule],
  controllers: [HealthController],
})
export class AppModule {}

