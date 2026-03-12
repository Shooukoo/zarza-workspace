import { Module } from '@nestjs/common';
import { FruitsModule } from './fruits/fruits.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, FruitsModule],
})
export class AppModule {}

