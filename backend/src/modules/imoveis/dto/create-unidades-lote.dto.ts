import { IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateUnidadesLoteDto {
  @IsInt()
  @Min(1)
  @Max(50)
  quantidade: number;

  @IsNumber()
  @Min(0)
  valor: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  prefixo?: string;
}
