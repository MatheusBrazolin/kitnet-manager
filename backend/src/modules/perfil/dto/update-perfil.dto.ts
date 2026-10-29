import { NormalizarEmail } from '../../../common/dto/normalizar-email';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}
