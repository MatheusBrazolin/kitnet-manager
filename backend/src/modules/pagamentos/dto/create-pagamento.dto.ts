import { IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class CreatePagamentoDto {
  @IsNumber()
  @Min(0)
  valor: number;

  @IsDateString()
  vencimento: string;

  @IsInt()
  moradorId: number;
}
