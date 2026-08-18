import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class MarcarPagoDto {
  // Data em que o valor foi efetivamente recebido. Opcional — se não vier, usa a data de hoje.
  @IsOptional()
  @IsDateString()
  dataPagamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  formaPagamento?: string;
}
