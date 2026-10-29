import { PartialType } from '@nestjs/mapped-types';
import { CreateImobiliariaDto } from './create-imobiliaria.dto';

export class UpdateImobiliariaDto extends PartialType(CreateImobiliariaDto) {}
