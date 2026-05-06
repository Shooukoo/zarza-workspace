import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { Analysis, AnalysisSchema } from './analyses.schema';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Analysis.name, schema: AnalysisSchema }]),
    AuthModule,
    StorageModule,
  ],
  controllers: [AnalysesController],
  providers: [AnalysesService],
})
export class AnalysesModule {}
