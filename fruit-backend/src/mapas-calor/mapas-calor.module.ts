import { Module } from '@nestjs/common';
import { MapasCalorController } from './mapas-calor.controller';
import { MapasCalorService } from './mapas-calor.service';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MapasCalorController],
  providers: [MapasCalorService],
})
export class MapasCalorModule {}
