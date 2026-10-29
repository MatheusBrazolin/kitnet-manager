import { PartialType } from '@nestjs/mapped-types';
import { CreateMoradorDto } from './create-morador.dto';

/**
 * `kitnetId` é editável de propósito.
 *
 * Antes ele era omitido, e a tela mandava "remova e cadastre de novo se precisar
 * mudar a unidade" — só que remover um morador cascateia em Pagamento e apaga todo
 * o histórico financeiro dele. Mudar um inquilino de quarto destruía o passado.
 *
 * O service revalida a posse da unidade nova e mantém o status das duas unidades
 * coerente (a antiga pode ficar vaga, a nova vira ocupada).
 */
export class UpdateMoradorDto extends PartialType(CreateMoradorDto) {}
