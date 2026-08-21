import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ViewerReadOnlyGuard } from './viewer-read-only.guard';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

function contextFor(
  method: string,
  user?: AuthenticatedUser,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, user }),
    }),
  } as unknown as ExecutionContext;
}

describe('ViewerReadOnlyGuard', () => {
  let guard: ViewerReadOnlyGuard;
  const visualizador = { papel: 'VISUALIZADOR' } as AuthenticatedUser;
  const gerente = { papel: 'GERENTE' } as AuthenticatedUser;
  const owner = { papel: 'OWNER' } as AuthenticatedUser;

  beforeEach(() => {
    guard = new ViewerReadOnlyGuard();
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'always allows safe method %s, regardless of papel',
    (method) => {
      expect(guard.canActivate(contextFor(method, visualizador))).toBe(true);
    },
  );

  it.each(['POST', 'PATCH', 'DELETE', 'PUT'])(
    'blocks %s with ForbiddenException when papel is VISUALIZADOR',
    (method) => {
      expect(() => guard.canActivate(contextFor(method, visualizador))).toThrow(
        ForbiddenException,
      );
    },
  );

  it.each(['POST', 'PATCH', 'DELETE'])(
    'allows %s when papel is GERENTE',
    (method) => {
      expect(guard.canActivate(contextFor(method, gerente))).toBe(true);
    },
  );

  it.each(['POST', 'PATCH', 'DELETE'])(
    'allows %s when papel is OWNER',
    (method) => {
      expect(guard.canActivate(contextFor(method, owner))).toBe(true);
    },
  );

  it('allows writes when there is no user attached (defensive default, JwtAuthGuard runs first)', () => {
    expect(guard.canActivate(contextFor('POST', undefined))).toBe(true);
  });
});
