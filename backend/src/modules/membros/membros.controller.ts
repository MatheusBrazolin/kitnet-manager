import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { MembrosService } from './membros.service';
import { CreateMembroDto } from './dto/create-membro.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('membros')
export class MembrosController {
  constructor(private readonly membrosService: MembrosService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    if (user.papel === 'VISUALIZADOR') {
      throw new ForbiddenException(
        'Você não tem acesso à gestão de membros desta conta.',
      );
    }
    return this.membrosService.findAll(user.contaId);
  }

  // As rotas abaixo são do ponto de vista do CONVIDADO, não do dono: enquanto o convite
  // está pendente ele ainda opera na própria conta, então seu papel é sempre OWNER e
  // nenhuma restrição de papel se aplica aqui.
  @Get('convite')
  convitePendente(@CurrentUser() user: AuthenticatedUser) {
    return this.membrosService.findConvitePendente(user.id);
  }

  @Post('convite/aceitar')
  aceitarConvite(@CurrentUser() user: AuthenticatedUser) {
    return this.membrosService.aceitarConvite(user.id);
  }

  @Post('convite/recusar')
  recusarConvite(@CurrentUser() user: AuthenticatedUser) {
    return this.membrosService.recusarConvite(user.id);
  }

  /** Saída por iniciativa do próprio membro — não depende do dono. */
  @Delete('me')
  sair(@CurrentUser() user: AuthenticatedUser) {
    return this.membrosService.sairDaConta(user.id);
  }

  @Post()
  @Roles('OWNER')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMembroDto) {
    return this.membrosService.create(user.contaId, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.membrosService.remove(user.contaId, id);
  }
}
