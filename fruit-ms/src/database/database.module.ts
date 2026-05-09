import { Module } from '@nestjs/common';
import { DatabaseModule as PrismaDatabaseModule } from '@rubus/database';

@Module({
  imports: [PrismaDatabaseModule],
  exports: [PrismaDatabaseModule],
})
export class DatabaseModule {}
