import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { FruitsController } from './fruits.controller';
import { FruitsService } from './fruits.service';
import { Analysis, AnalysisSchema } from './schemas/analysis.schema';
import { ANALYSIS_REPOSITORY } from './ports';

import { MongoAnalysisRepository } from './infrastructure/analysis.mongoose.repository';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Analysis.name, schema: AnalysisSchema }]),
  ],
  controllers: [FruitsController],
  providers: [
    FruitsService,
    // Bind del puerto a su implementación concreta.
    // Cambiar de MongoDB a otro adaptador = sustituir sólo este provider.
    {
      provide: ANALYSIS_REPOSITORY,
      useClass: MongoAnalysisRepository,
    },
  ],
})
export class FruitsModule {}
