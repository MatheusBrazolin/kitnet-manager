import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateImovelDto {
  @IsString()
  @MinLength(1)
  nome: string;

  @IsOptional()
  @IsString()
  endereco?: string;
}
