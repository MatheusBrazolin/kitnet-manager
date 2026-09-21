import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Bloqueia qualquer escrita (POST/PATCH/DELETE) quando o usuário autenticado
 * é um membro com papel VISUALIZADOR — acesso só leitura à conta que ele acompanha.
 * Precisa rodar depois do JwtAuthGuard, que é quem popula request.user.
 */
@Injectable()
export class ViewerReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; user?: AuthenticatedUser }>();
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const user = request.user;
    if (user?.papel === 'VISUALIZADOR') {
      throw new ForbiddenException(
        'Seu acesso é somente leitura — peça ao dono da conta para fazer esta alteração.',
      );
    }

    return true;
  }
}
