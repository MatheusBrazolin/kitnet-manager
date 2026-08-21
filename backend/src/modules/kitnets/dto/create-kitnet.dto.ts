import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateKitnetDto {
  @IsString()
  @MinLength(1)
  numero: string;

  @IsNumber()
  @Min(0)
  valor: number;

  // Parte do valor do aluguel retida pela imobiliária (ex.: aluguel de 1400, imobiliária
  // fica com 100). Omitido/null quando o aluguel é direto, sem imobiliária.
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxaImobiliaria?: number | null;

  @IsInt()
  imovelId: number;
}
