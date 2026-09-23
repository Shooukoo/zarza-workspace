import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { MultipartImagePipe } from '../ingestion/pipes/multipart-image.pipe';
import { MagicNumberValidator } from '../ingestion/validators/magic-number.validator';
import { DamageClassificationController } from './damage-classification.controller';
import { DamageClassificationService } from './damage-classification.service';

@Module({
  imports: [AuthModule, HttpModule],
  controllers: [DamageClassificationController],
  providers: [DamageClassificationService, MultipartImagePipe, MagicNumberValidator],
})
export class DamageClassificationModule {}
