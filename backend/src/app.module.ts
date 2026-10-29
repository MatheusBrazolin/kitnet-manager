import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './database/prisma.module';
import { ContaModule } from './common/conta/conta.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { KitnetsModule } from './modules/kitnets/kitnets.module';
import { ImoveisModule } from './modules/imoveis/imoveis.module';
import { ImobiliariasModule } from './modules/imobiliarias/imobiliarias.module';
import { MoradoresModule } from './modules/moradores/moradores.module';
import { PagamentosModule } from './modules/pagamentos/pagamentos.module';
import { GastosModule } from './modules/gastos/gastos.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { MembrosModule } from './modules/membros/membros.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        // Formato legível em dev, JSON puro (mais fácil de filtrar/buscar) em produção.
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty' },
        autoLogging: true,
        redact: [
          'req.headers.authorization',
          'req.body.password',
          // Preventivo: o pino-http não serializa o corpo hoje, mas se alguém
          // acrescentar um serializer as senhas de /perfil/senha iriam para o log.
          'req.body.senhaAtual',
          'req.body.novaSenha',
        ],
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    ContaModule,
    AuthModule,
    UsersModule,
    KitnetsModule,
    ImoveisModule,
    ImobiliariasModule,
    MoradoresModule,
    PagamentosModule,
    GastosModule,
    DashboardModule,
    RelatoriosModule,
    MembrosModule,
    PerfilModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
