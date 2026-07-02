import { PartialType } from '@nestjs/mapped-types';
import { CreateKitnetDto } from './create-kitnet.dto';

export class UpdateKitnetDto extends PartialType(CreateKitnetDto) {}
