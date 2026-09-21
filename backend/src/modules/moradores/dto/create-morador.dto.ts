import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMoradorDto {
  @IsString()
  @MinLength(1)
  nome: string;

  @IsString()
  @MinLength(8)
  telefone: string;

  @IsInt()
  kitnetId: number;

  @IsOptional()
  @IsDateString()
  dataEntrada?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  diaVencimento?: number;
}
