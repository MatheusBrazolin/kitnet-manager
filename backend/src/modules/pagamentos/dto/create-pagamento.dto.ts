import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePagamentoDto {
  @IsNumber()
  @Min(0)
  valor: number;

  @IsDateString()
  vencimento: string;

  @IsInt()
  moradorId: number;

  // Anotação livre, opcional — útil quando o valor lançado difere do combinado na kitnet
  // (ex.: "Proporcional a 19 dias", "1º mês repassado à imobiliária").
  @IsOptional()
  @IsString()
  observacao?: string;
}
