import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrainingController } from './training.controller';
import { TrainingInternalController } from './training-internal.controller';
import { TrainingService } from './training.service';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AuthModule, StorageModule, HttpModule],
  controllers: [TrainingController, TrainingInternalController],
  providers: [TrainingService],
})
export class TrainingModule {}
