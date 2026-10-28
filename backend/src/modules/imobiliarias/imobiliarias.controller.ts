import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ViewerReadOnlyGuard } from '../../common/guards/viewer-read-only.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { ImobiliariasService } from './imobiliarias.service';
import { CreateImobiliariaDto } from './dto/create-imobiliaria.dto';
import { UpdateImobiliariaDto } from './dto/update-imobiliaria.dto';

// ViewerReadOnlyGuard dá exatamente a regra pedida: GERENTE escreve, VISUALIZADOR só lê.
// Não há @Roles aqui — gerenciar administradoras é parte da operação do dia a dia, não
// uma ação restrita ao dono como acontece em /membros.
@UseGuards(JwtAuthGuard, ViewerReadOnlyGuard)
@Controller('imobiliarias')
export class ImobiliariasController {
  constructor(private readonly imobiliariasService: ImobiliariasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.imobiliariasService.findAll(user.contaId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.imobiliariasService.findOwnedOrThrow(user.contaId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateImobiliariaDto,
  ) {
    return this.imobiliariasService.create(user.contaId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateImobiliariaDto,
  ) {
    return this.imobiliariasService.update(user.contaId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.imobiliariasService.remove(user.contaId, id);
  }
}
