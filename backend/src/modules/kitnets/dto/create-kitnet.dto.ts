import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { TaxaTipo } from '@prisma/client';

export class CreateKitnetDto {
  @IsString()
  @MinLength(1)
  numero: string;

  @IsNumber()
  @Min(0)
  valor: number;

  // Taxa desta unidade especificamente. Omitida/null significa "segue a taxa padrão da
  // imobiliária vinculada" — e, sem imobiliária, que o aluguel é direto. Zero é
  // diferente de omitido: é uma isenção negociada para esta unidade.
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxaImobiliaria?: number | null;

  // Diz se o número acima é um percentual do aluguel ou um valor fixo em reais.
  @IsOptional()
  @IsEnum(TaxaTipo)
  taxaTipo?: TaxaTipo;

  // Null = gestão direta, sem administradora.
  @IsOptional()
  @IsInt()
  imobiliariaId?: number | null;

  @IsInt()
  imovelId: number;
}
