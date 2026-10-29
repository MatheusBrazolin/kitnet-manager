import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { PerfilService } from './perfil.service';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { UpdateSenhaDto } from './dto/update-senha.dto';

/**
 * Único controller de escrita SEM ViewerReadOnlyGuard, de propósito.
 *
 * Aquele guard protege os DADOS de uma conta de terceiro: um membro VISUALIZADOR
 * acompanha a conta de outra pessoa só para leitura. O perfil não é dado da conta, é da
 * própria pessoa — nome, e-mail e senha dela. Bloquear aqui deixaria o visualizador sem
 * conseguir nem trocar a própria senha.
 *
 * Também não existe rota por id (`/perfil/:id`): o alvo é sempre `user.id` do token, o
 * que torna impossível um usuário editar o perfil de outro.
 */
@UseGuards(JwtAuthGuard)
@Controller('perfil')
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Patch()
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePerfilDto) {
    return this.perfilService.update(user.id, dto);
  }

  @Patch('senha')
  updateSenha(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSenhaDto,
  ) {
    return this.perfilService.updateSenha(user.id, dto);
  }
}
