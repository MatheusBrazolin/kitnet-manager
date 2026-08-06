import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { KitnetsModule } from './modules/kitnets/kitnets.module';
import { ImoveisModule } from './modules/imoveis/imoveis.module';
import { MoradoresModule } from './modules/moradores/moradores.module';
import { PagamentosModule } from './modules/pagamentos/pagamentos.module';
import { GastosModule } from './modules/gastos/gastos.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    KitnetsModule,
    ImoveisModule,
    MoradoresModule,
    PagamentosModule,
    GastosModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
