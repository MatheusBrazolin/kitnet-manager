import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsNumber, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class UnidadeLoteItemDto {
  @IsString()
  @MinLength(1)
  numero: string;

  @IsNumber()
  @Min(0)
  valor: number;
}

export class CreateUnidadesLoteDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => UnidadeLoteItemDto)
  unidades: UnidadeLoteItemDto[];
}
