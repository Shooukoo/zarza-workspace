import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CamposController } from './campos.controller';
import { CamposService } from './campos.service';
import { Campo, CampoSchema } from './schemas/campo.schema';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campo.name, schema: CampoSchema },
    ]),
    AuthModule,
  ],
  controllers: [CamposController],
  providers: [CamposService],
  exports: [CamposService],
})
export class CamposModule {}
