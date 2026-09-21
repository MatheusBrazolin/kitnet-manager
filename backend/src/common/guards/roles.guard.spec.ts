import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { Papel } from '../conta/conta.service';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function contexto(papel?: Papel) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: papel ? { papel } : undefined }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as never;
  }

  function comRoles(papeis: Papel[] | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(papeis);
  }

  it('libera o handler quando nenhum @Roles foi declarado', () => {
    comRoles(undefined);
    expect(guard.canActivate(contexto('VISUALIZADOR'))).toBe(true);
  });

  it('libera quando o papel do usuário está na lista', () => {
    comRoles(['OWNER']);
    expect(guard.canActivate(contexto('OWNER'))).toBe(true);
  });

  it('bloqueia quando o papel não está na lista', () => {
    comRoles(['OWNER']);
    expect(() => guard.canActivate(contexto('GERENTE'))).toThrow(
      ForbiddenException,
    );
  });

  // Fail-closed: se por algum motivo a request chegar sem usuário resolvido, o guard
  // nega em vez de deixar passar.
  it('bloqueia quando não há usuário na request', () => {
    comRoles(['OWNER']);
    expect(() => guard.canActivate(contexto(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
