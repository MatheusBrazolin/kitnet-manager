import { NormalizarEmail } from '../../../common/dto/normalizar-email';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AVATAR_CORES } from '../../../common/avatar/cores';

export class UpdatePerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @NormalizarEmail()
  @IsEmail()
  email?: string;

  /**
   * Obrigatória APENAS quando o e-mail muda.
   *
   * Não existe confirmação por link (o projeto ainda não tem provedor de e-mail
   * transacional), então a senha é a única prova de que quem está trocando o e-mail de
   * login é mesmo o dono da conta. Sem isso, um token roubado bastava para trocar
   * e-mail e senha e deixar a vítima sem caminho de volta.
   */
  @IsOptional()
  @IsString()
  senhaAtual?: string;

  /** Contato do próprio usuário. Vazio é apagar o que estava lá. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  telefone?: string;

  // Recusa um tom inventado: o banco guarda o nome, e um nome que a tela não conhece
  // viraria um avatar sem cor nenhuma.
  @IsOptional()
  @IsIn(AVATAR_CORES as readonly string[])
  avatarCor?: string;
}
