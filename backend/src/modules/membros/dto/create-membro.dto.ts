import { NormalizarEmail } from '../../../common/dto/normalizar-email';
import { IsEmail, IsIn } from 'class-validator';

export class CreateMembroDto {
  @NormalizarEmail()
  @IsEmail()
  email: string;

  @IsIn(['GERENTE', 'VISUALIZADOR'])
  papel: 'GERENTE' | 'VISUALIZADOR';
}
