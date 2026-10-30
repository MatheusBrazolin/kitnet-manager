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
      telefone: undefined,
      avatarCor: undefined,
      createdAt: undefined,
      fotoAtualizadaEm: null,
    });
  });

  // A data da foto é chave de cache na tela: trocar a foto muda a data, e o avatar
  // antigo deixa de ser reaproveitado sozinho.
  it('informa quando a foto foi enviada, sem carregar os bytes dela', async () => {
    const enviadaEm = new Date('2026-10-30T10:00:00Z');
    usersService.findById.mockResolvedValue({
      id: 1,
      name: 'Maria',
      email: 'maria@example.com',
      plano: 'FREE',
      foto: { atualizadaEm: enviadaEm },
    });
    contaService.resolve.mockResolvedValue({ contaId: 1, papel: 'OWNER' });

    const result = await strategy.validate({
      sub: 1,
      email: 'maria@example.com',
    });

    expect(result.fotoAtualizadaEm).toEqual(enviadaEm);
    expect(result).not.toHaveProperty('foto');
  });

  // Trocar a senha precisa derrubar as sessões abertas em outros aparelhos. O JWT é
  // stateless e vale 7 dias, então sem esta checagem um token vazado continuava com
  // acesso total mesmo depois de a vítima trocar a senha.
  describe('token emitido antes da última troca de senha', () => {
    const trocadaEm = new Date('2026-10-29T12:00:00Z');
    const usuario = {
      id: 1,
      name: 'Maria',
      email: 'maria@example.com',
      plano: 'FREE',
      passwordChangedAt: trocadaEm,
    };

    beforeEach(() => {
      contaService.resolve.mockResolvedValue({ contaId: 1, papel: 'OWNER' });
    });

    it('recusa um token emitido antes da troca', async () => {
      usersService.findById.mockResolvedValue(usuario);
      const iatAntes = Math.floor(trocadaEm.getTime() / 1000) - 60;

      await expect(
        strategy.validate({ sub: 1, email: usuario.email, iat: iatAntes }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('aceita um token emitido depois da troca', async () => {
      usersService.findById.mockResolvedValue(usuario);
      const iatDepois = Math.floor(trocadaEm.getTime() / 1000) + 60;

      await expect(
        strategy.validate({ sub: 1, email: usuario.email, iat: iatDepois }),
      ).resolves.toMatchObject({ id: 1 });
    });

    // `iat` vem truncado para o segundo: sem truncar a data do banco também, o token
    // emitido pela PRÓPRIA troca de senha seria recusado e a pessoa cairia para fora
    // logo depois de trocar.
    it('aceita o token emitido no mesmo segundo da troca', async () => {
      usersService.findById.mockResolvedValue({
        ...usuario,
        passwordChangedAt: new Date('2026-10-29T12:00:00.750Z'),
      });
      const iatMesmoSegundo = Math.floor(trocadaEm.getTime() / 1000);

      await expect(
        strategy.validate({
          sub: 1,
          email: usuario.email,
          iat: iatMesmoSegundo,
        }),
      ).resolves.toMatchObject({ id: 1 });
    });

    it('não recusa quem nunca trocou a senha', async () => {
      usersService.findById.mockResolvedValue({
        ...usuario,
        passwordChangedAt: null,
      });

      await expect(
        strategy.validate({ sub: 1, email: usuario.email, iat: 1 }),
      ).resolves.toMatchObject({ id: 1 });
    });
  });
});
