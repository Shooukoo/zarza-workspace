import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { FruitsController } from './fruits.controller';
import { FruitsService } from './fruits.service';
import { Analysis, AnalysisSchema } from './schemas/analysis.schema';
import { ANALYSIS_REPOSITORY } from './ports';
import { I_INFERENCE_PORT } from './ports/inference.port';

import { MongoAnalysisRepository } from './infrastructure/analysis.mongoose.repository';
import { InferenceHttpAdapter } from './infrastructure/inference-http.adapter';

@Module({
  imports: [
    HttpModule, // Necesario para InferenceHttpAdapter
    MongooseModule.forFeature([{ name: Analysis.name, schema: AnalysisSchema }]),
  ],
  controllers: [FruitsController],
  providers: [
    FruitsService,
    // Repositorio de persistencia: Mongoose → IAnalysisRepository
    {
      provide: ANALYSIS_REPOSITORY,
      useClass: MongoAnalysisRepository,
    },
    // Adapter de inferencia: HTTP → IInferencePort
    {
      provide: I_INFERENCE_PORT,
      useClass: InferenceHttpAdapter,
    },
  ],
})
export class FruitsModule {}

