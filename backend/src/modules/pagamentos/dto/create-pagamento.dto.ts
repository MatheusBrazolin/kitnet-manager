import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePagamentoDto {
  @IsNumber()
  @Min(0)
  valor: number;

  @IsDateString()
  vencimento: string;

  @IsOptional()
  @IsBoolean()
  pago?: boolean;

  @IsInt()
  moradorId: number;
}
