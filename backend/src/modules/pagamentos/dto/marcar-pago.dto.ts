import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class MarcarPagoDto {
  // Data em que o valor foi efetivamente recebido. Opcional — se não vier, usa a data de hoje.
  @IsOptional()
  @IsDateString()
  dataPagamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  formaPagamento?: string;

  // Valor que o proprietário realmente recebeu, quando o repasse veio diferente do
  // calculado (a imobiliária descontou algo a mais, arredondou, cobrou uma avulsa).
  // Omitido = usa o cálculo da taxa da unidade. Informado = a taxa passa a ser a
  // diferença para o bruto, porque é isso que de fato ficou retido.
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorLiquido?: number;
}
