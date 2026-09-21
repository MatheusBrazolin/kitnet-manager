import { SetMetadata } from '@nestjs/common';
import type { Papel } from '../conta/conta.service';

export const ROLES_KEY = 'papeis-permitidos';

/**
 * Declara quais papéis podem executar o handler. Lido pelo RolesGuard.
 * Ex.: `@Roles('OWNER')` numa rota que só o dono da conta pode chamar.
 */
export const Roles = (...papeis: Papel[]) => SetMetadata(ROLES_KEY, papeis);
