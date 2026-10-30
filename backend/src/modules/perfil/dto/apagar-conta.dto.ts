import { IsString, MinLength } from 'class-validator';

/**
 * Apagar a conta é irreversível e apaga em cascata imóveis, unidades, moradores,
 * pagamentos e gastos. A senha atual é exigida pelo mesmo motivo da troca de e-mail
 * (ver PerfilService.update): um token vazado não pode bastar para destruir a conta
 * de alguém.
 */
export class ApagarContaDto {
  @IsString()
  @MinLength(1)
  senhaAtual: string;
}
