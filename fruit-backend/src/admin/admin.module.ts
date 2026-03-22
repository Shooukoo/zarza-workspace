import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  UserDocument,
  UserSchema,
} from '../auth/infrastructure/schemas/user.schema';
import {
  AnalysisDashboardDocument,
  AnalysisDashboardSchema,
} from './schemas/analysis.schema';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [
    // Necesitamos el modelo de Usuario y de Análisis para las operaciones de admin
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
      { name: AnalysisDashboardDocument.name, schema: AnalysisDashboardSchema },
    ]),
    // AuthModule exporta I_TOKEN_PORT que necesita JwtAuthGuard
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminDashboardService],
})
export class AdminModule {}
