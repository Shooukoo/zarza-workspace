import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FruitsController } from './fruits.controller';
import { FruitsService } from './fruits.service';
import { ANALYSIS_REPOSITORY } from './ports';
import { I_INFERENCE_PORT } from './ports/inference.port';
import { PrismaAnalysisRepository } from './infrastructure/analysis.prisma.repository';
import { InferenceHttpAdapter } from './infrastructure/inference-http.adapter';

@Module({
  imports: [HttpModule],
  controllers: [FruitsController],
  providers: [
    FruitsService,
    { provide: ANALYSIS_REPOSITORY, useClass: PrismaAnalysisRepository },
    { provide: I_INFERENCE_PORT, useClass: InferenceHttpAdapter },
  ],
})
export class FruitsModule {}
