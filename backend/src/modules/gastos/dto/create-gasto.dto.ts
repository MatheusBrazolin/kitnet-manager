import {
  IsDateString,
  IsInt,
  IsNumber,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGastoDto {
  @IsString()
  @MinLength(1)
  descricao: string;

  @IsNumber()
  @Min(0)
  valor: number;

  @IsDateString()
  data: string;

  @IsInt()
  kitnetId: number;
}
