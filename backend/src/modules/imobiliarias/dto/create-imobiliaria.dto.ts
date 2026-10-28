import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TaxaTipo } from '@prisma/client';

export class CreateImobiliariaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nome: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  telefone: string;

  // Corretor ou responsável pelo contato do dia a dia.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contato?: string | null;

  @IsEnum(TaxaTipo)
  taxaPadraoTipo: TaxaTipo;

  // Sem teto aqui: um percentual acima de 100 é absurdo mas não é inválido de se
  // digitar, e `calcularRepasse` já o limita a 100% em vez de produzir líquido negativo.
  @IsNumber()
  @Min(0)
  taxaPadraoValor: number;
}
