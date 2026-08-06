import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ImoveisService } from './imoveis.service';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';
import { CreateUnidadesLoteDto } from './dto/create-unidades-lote.dto';

@UseGuards(JwtAuthGuard)
@Controller('imoveis')
export class ImoveisController {
  constructor(private readonly imoveisService: ImoveisService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.imoveisService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.imoveisService.findOwnedOrThrow(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateImovelDto) {
    return this.imoveisService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateImovelDto,
  ) {
    return this.imoveisService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.imoveisService.remove(user.id, id);
  }

  @Post(':id/unidades-lote')
  createUnidadesLote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateUnidadesLoteDto,
  ) {
    return this.imoveisService.createUnidadesLote(user.id, id, dto);
  }
}
