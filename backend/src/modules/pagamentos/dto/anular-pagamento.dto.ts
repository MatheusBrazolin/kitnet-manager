import { IsOptional, IsString } from 'class-validator';

export class AnularPagamentoDto {
  // Motivo opcional (ex.: "Repassado à imobiliária", "Morador saiu antes do fim do mês").
  @IsOptional()
  @IsString()
  observacao?: string;
}
