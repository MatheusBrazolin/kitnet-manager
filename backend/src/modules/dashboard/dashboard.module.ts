import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PagamentosModule } from '../pagamentos/pagamentos.module';

@Module({
  imports: [PagamentosModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
