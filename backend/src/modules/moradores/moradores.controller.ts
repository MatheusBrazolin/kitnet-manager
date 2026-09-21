import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ViewerReadOnlyGuard } from '../../common/guards/viewer-read-only.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MoradoresService } from './moradores.service';
import { CreateMoradorDto } from './dto/create-morador.dto';
import { UpdateMoradorDto } from './dto/update-morador.dto';
import { RegistrarSaidaDto } from './dto/registrar-saida.dto';

@UseGuards(JwtAuthGuard, ViewerReadOnlyGuard)
@Controller('moradores')
export class MoradoresController {
  constructor(private readonly moradoresService: MoradoresService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.moradoresService.findAll(user.contaId, pagination);
  }

  /**
   * Encerra a locação preservando o histórico — a alternativa ao DELETE, que cascateia
   * em Pagamento e apaga os lançamentos financeiros do morador.
   */
  @Patch(':id/registrar-saida')
  registrarSaida(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarSaidaDto,
  ) {
    return this.moradoresService.registrarSaida(
      user.contaId,
      id,
      dto.dataSaida,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.moradoresService.findDetail(user.contaId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMoradorDto,
  ) {
    return this.moradoresService.create(user.contaId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMoradorDto,
  ) {
    return this.moradoresService.update(user.contaId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.moradoresService.remove(user.contaId, id);
  }
}
