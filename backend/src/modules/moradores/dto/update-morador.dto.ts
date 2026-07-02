import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateMoradorDto } from './create-morador.dto';

export class UpdateMoradorDto extends PartialType(OmitType(CreateMoradorDto, ['kitnetId'] as const)) {}
