import { IsDateString, IsOptional } from 'class-validator';

export class RegistrarSaidaDto {
  // Data em que a locação terminou. Opcional — se não vier, usa hoje.
  @IsOptional()
  @IsDateString()
  dataSaida?: string;
}
