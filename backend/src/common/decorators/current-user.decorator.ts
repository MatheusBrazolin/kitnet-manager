import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Papel } from '../conta/conta.service';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  plano: string;
  /** Conta cujos dados devem ser lidos/escritos — a própria (dono) ou a de quem o convidou (membro). */
  contaId: number;
  papel: Papel;
  /** Nome do dono da conta, quando este usuário é membro (não dono). */
  donoNome?: string;
  telefone?: string | null;
  avatarCor?: string | null;
  /** Quando a conta foi criada — a tela mostra como "membro desde". */
  createdAt?: Date;
  /**
   * Quando a foto foi enviada, ou `null` se não há foto.
   *
   * A data, e não um booleano: ela também serve de chave de cache na tela — trocar
   * a foto muda a data, e o avatar antigo deixa de ser reaproveitado sozinho.
   */
  fotoAtualizadaEm?: Date | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
