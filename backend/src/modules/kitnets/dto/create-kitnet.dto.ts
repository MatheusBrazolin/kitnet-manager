import { IsInt, IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateKitnetDto {
  @IsString()
  @MinLength(1)
  numero: string;

  @IsNumber()
  @Min(0)
  valor: number;

  @IsInt()
  imovelId: number;
}
