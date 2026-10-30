import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { PerfilService } from './perfil.service';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { UpdateSenhaDto } from './dto/update-senha.dto';
import { ApagarContaDto } from './dto/apagar-conta.dto';
import { TAMANHO_MAXIMO_FOTO, type ArquivoEnviado } from './foto';

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

  // 5/min como no login, e não os 60/min do teto global: esta rota é um oráculo de
  // `senhaAtual`. Quem já tem um token (sessão deixada aberta, aparelho emprestado)
  // teria ~86 mil tentativas por dia para adivinhar a senha e então trocá-la,
  // assumindo a conta.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Patch('senha')
  updateSenha(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSenhaDto,
  ) {
    return this.perfilService.updateSenha(user.id, dto);
  }

  /**
   * Cópia de tudo que a conta guarda (LGPD, art. 18, V).
   *
   * Limite baixo porque a consulta varre a conta inteira — é a rota mais cara da API,
   * e ninguém precisa de mais que alguns downloads por hora.
   */
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Get('exportar')
  exportar(@CurrentUser() user: AuthenticatedUser) {
    return this.perfilService.exportarDados(user.id);
  }

  /**
   * Envia a foto de perfil.
   *
   * O limite também vai no interceptor, e não só no serviço: assim o multer corta o
   * upload enquanto ele ainda está chegando, em vez de deixar a função carregar o
   * arquivo inteiro na memória para só então recusá-lo.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('foto')
  @UseInterceptors(
    FileInterceptor('foto', { limits: { fileSize: TAMANHO_MAXIMO_FOTO } }),
  )
  enviarFoto(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() foto?: ArquivoEnviado,
  ) {
    return this.perfilService.salvarFoto(user.id, foto);
  }

  /**
   * A própria foto, em binário.
   *
   * Sem rota por id: `<img src>` não manda cabeçalho de autenticação, então uma rota
   * pública `/perfil/foto/:id` deixaria o rosto de qualquer usuário acessível a quem
   * enumerasse ids. A tela busca a imagem pelo cliente HTTP, que leva o token, e a
   * transforma em data URL. Mostrar a foto de OUTRO membro da equipe vai precisar de
   * um caminho próprio (URL assinada ou similar) — hoje nenhuma tela faz isso.
   *
   * `private` no cache: é imagem de uma pessoa, não pode ficar num proxy compartilhado.
   */
  @Get('foto')
  @Header('Cache-Control', 'private, max-age=0, must-revalidate')
  async baixarFoto(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const foto = await this.perfilService.lerFoto(user.id);
    res.type(foto.tipo).send(Buffer.from(foto.dados));
  }

  @Delete('foto')
  removerFoto(@CurrentUser() user: AuthenticatedUser) {
    return this.perfilService.removerFoto(user.id);
  }

  // 5/min pelo mesmo motivo de `PATCH senha`: a rota confere `senhaAtual` e, portanto,
  // também é um oráculo de senha — com a diferença de que acertar aqui destrói a conta.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Delete()
  apagarConta(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApagarContaDto,
  ) {
    return this.perfilService.apagarConta(user.id, dto);
  }
}
