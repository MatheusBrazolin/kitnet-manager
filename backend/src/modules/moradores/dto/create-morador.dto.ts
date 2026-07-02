import { IsInt, IsString, MinLength } from 'class-validator';

export class CreateMoradorDto {
  @IsString()
  @MinLength(1)
  nome: string;

  @IsString()
  @MinLength(8)
  telefone: string;

  @IsInt()
  kitnetId: number;
}
