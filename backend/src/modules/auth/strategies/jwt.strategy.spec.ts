import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { ContaService } from '../../../common/conta/conta.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };
  let contaService: { resolve: jest.Mock };

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };
    usersService = { findById: jest.fn() };
    contaService = { resolve: jest.fn() };

    strategy = new JwtStrategy(
      configService as unknown as ConfigService,
      usersService as unknown as UsersService,
      contaService as unknown as ContaService,
    );
  });

  it('throws UnauthorizedException when the token subject no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 999, email: 'ghost@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(contaService.resolve).not.toHaveBeenCalled();
  });

  it('attaches contaId/papel resolved from the conta ao usuário autenticado', async () => {
    usersService.findById.mockResolvedValue({
      id: 1,
      name: 'Maria',
      email: 'maria@example.com',
      plano: 'FREE',
    });
    contaService.resolve.mockResolvedValue({
      contaId: 5,
      papel: 'GERENTE',
      donoNome: 'Dona Conta',
    });

    const result = await strategy.validate({
      sub: 1,
      email: 'maria@example.com',
    });

    expect(result).toEqual({
      id: 1,
      name: 'Maria',
      email: 'maria@example.com',
      plano: 'FREE',
      contaId: 5,
      papel: 'GERENTE',
      donoNome: 'Dona Conta',
    });
  });
});
