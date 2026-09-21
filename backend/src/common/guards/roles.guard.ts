import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { Papel } from '../conta/conta.service';

/**
 * Restringe um handler aos papéis declarados em `@Roles(...)`.
 *
 * Existe porque a autorização por papel de /membros era código imperativo dentro de cada
 * handler (um `assertIsOwner()` chamado à mão). Quem adicionasse um endpoint novo e
 * esquecesse a chamada abria a rota para qualquer membro autenticado — e nada no build,
 * no lint ou nos testes acusava. Com o guard, a falha é por omissão do decorator, que é
 * visível na leitura do controller.
 *
 * Precisa rodar depois do JwtAuthGuard, que é quem popula request.user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permitidos = this.reflector.getAllAndOverride<Papel[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sem @Roles no handler nem na classe, o guard não opina — quem restringe o acesso
    // são os outros guards (JWT, ViewerReadOnly).
    if (!permitidos || permitidos.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const papel = request.user?.papel;
    if (!papel || !permitidos.includes(papel)) {
      throw new ForbiddenException(
        'Você não tem permissão para esta ação nesta conta.',
      );
    }

    return true;
  }
}
