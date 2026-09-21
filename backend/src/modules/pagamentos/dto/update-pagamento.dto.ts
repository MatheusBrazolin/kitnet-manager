import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePagamentoDto } from './create-pagamento.dto';

export class UpdatePagamentoDto extends PartialType(
  OmitType(CreatePagamentoDto, ['moradorId'] as const),
) {}
