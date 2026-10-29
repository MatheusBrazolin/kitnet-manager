import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Faixa deliberadamente estreita: o ano vira limites de data (`Date.UTC(ano, 0, 1)`), e
// um valor absurdo na querystring produziria um intervalo inválido no Postgres em vez de
// um erro de validação legível.
const ANO_MINIMO = 2000;
const ANO_MAXIMO = 2100;

export class RelatorioAnualQueryDto {
  // Opcional: sem `ano` na querystring o relatório assume o ano corrente, que é o que a
  // tela pede ao abrir pela primeira vez.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ANO_MINIMO)
  @Max(ANO_MAXIMO)
  ano?: number;
}
