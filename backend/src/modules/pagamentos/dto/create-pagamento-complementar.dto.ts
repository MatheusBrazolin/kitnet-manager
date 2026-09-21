import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Lançamento extra fora do aluguel do mês — já registrado como recebido (não passa por
// PENDENTE/marcar-pago como a parcela de aluguel).
export class CreatePagamentoComplementarDto {
  @IsNumber()
  @Min(0)
  valor: number;

  @IsInt()
  moradorId: number;

  // De quem veio o valor (ex.: "Ex-morador", "Fiador", nome de terceiro) — não coletado no
  // formulário hoje, mas aceito pela API caso venha a ser preenchido no futuro.
  @IsOptional()
  @IsString()
  origem?: string;

  @IsDateString()
  dataPagamento: string;

  @IsOptional()
  @IsString()
  formaPagamento?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
