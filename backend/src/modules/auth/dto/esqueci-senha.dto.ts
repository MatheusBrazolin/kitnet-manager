import { IsEmail } from 'class-validator';
import { NormalizarEmail } from '../../../common/dto/normalizar-email';

export class EsqueciSenhaDto {
  @NormalizarEmail()
  @IsEmail()
  email: string;
}
