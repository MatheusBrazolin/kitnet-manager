import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ViewerReadOnlyGuard } from '../../common/guards/viewer-read-only.guard';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PagamentosService } from './pagamentos.service';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';
import { CreatePagamentoComplementarDto } from './dto/create-pagamento-complementar.dto';
import { UpdatePagamentoDto } from './dto/update-pagamento.dto';
import { MarcarPagoDto } from './dto/marcar-pago.dto';
import { AnularPagamentoDto } from './dto/anular-pagamento.dto';

@UseGuards(JwtAuthGuard, ViewerReadOnlyGuard)
@Controller('pagamentos')
export class PagamentosController {
  constructor(private readonly pagamentosService: PagamentosService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.pagamentosService.findAll(user.contaId);
  }

  @Get('alertas')
  getAlertas(@CurrentUser() user: AuthenticatedUser) {
    return this.pagamentosService.getAlertas(user.contaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.pagamentosService.findOwnedOrThrow(user.contaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePagamentoDto) {
    return this.pagamentosService.create(user.contaId, dto);
  }

  @Post('complementar')
  createComplementar(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePagamentoComplementarDto) {
    return this.pagamentosService.createComplementar(user.contaId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePagamentoDto,
  ) {
    return this.pagamentosService.update(user.contaId, id, dto);
  }

  @Patch(':id/marcar-pago')
  marcarPago(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarcarPagoDto,
  ) {
    return this.pagamentosService.marcarPago(user.contaId, id, dto);
  }

  @Patch(':id/desfazer-pagamento')
  desfazerPagamento(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.pagamentosService.desfazerPagamento(user.contaId, id);
  }

  @Patch(':id/anular')
  anular(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularPagamentoDto,
  ) {
    return this.pagamentosService.anular(user.contaId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.pagamentosService.remove(user.contaId, id);
  }
}
