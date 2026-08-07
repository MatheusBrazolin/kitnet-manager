import { IsEmail, IsIn } from 'class-validator';

export class CreateMembroDto {
  @IsEmail()
  email: string;

  @IsIn(['GERENTE', 'VISUALIZADOR'])
  papel: 'GERENTE' | 'VISUALIZADOR';
}
