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
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
