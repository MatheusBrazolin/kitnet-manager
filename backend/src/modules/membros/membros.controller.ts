import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { MembrosService } from './membros.service';
import { CreateMembroDto } from './dto/create-membro.dto';

@UseGuards(JwtAuthGuard)
@Controller('membros')
export class MembrosController {
  constructor(private readonly membrosService: MembrosService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    if (user.papel === 'VISUALIZADOR') {
      throw new ForbiddenException('Você não tem acesso à gestão de membros desta conta.');
    }
    return this.membrosService.findAll(user.contaId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMembroDto) {
    this.assertIsOwner(user);
    return this.membrosService.create(user.contaId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    this.assertIsOwner(user);
    return this.membrosService.remove(user.contaId, id);
  }

  private assertIsOwner(user: AuthenticatedUser) {
    if (user.papel !== 'OWNER') {
      throw new ForbiddenException('Só o dono da conta pode gerenciar membros.');
    }
  }
}
