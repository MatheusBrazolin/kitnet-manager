import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ViewerReadOnlyGuard } from '../../common/guards/viewer-read-only.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { RelatoriosService } from './relatorios.service';
import { RelatorioAnualQueryDto } from './dto/relatorio-anual-query.dto';

@UseGuards(JwtAuthGuard, ViewerReadOnlyGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('anual')
  getAnual(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RelatorioAnualQueryDto,
  ) {
    // `contaId` e não `id`: um membro convidado lê o relatório da conta que acompanha,
    // igual a todo o resto do app.
    return this.relatoriosService.getAnual(
      user.contaId,
      query.ano ?? new Date().getUTCFullYear(),
    );
  }
}
