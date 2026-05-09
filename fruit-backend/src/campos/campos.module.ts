import { Module } from '@nestjs/common';
import { CamposController } from './campos.controller';
import { CamposService } from './campos.service';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CamposController],
  providers: [CamposService],
  exports: [CamposService],
})
export class CamposModule {}
