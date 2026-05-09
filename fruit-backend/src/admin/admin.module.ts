import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminDashboardService],
})
export class AdminModule {}
