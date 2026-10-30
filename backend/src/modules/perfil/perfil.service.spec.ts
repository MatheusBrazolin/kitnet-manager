import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PerfilService } from './perfil.service';
import { PrismaService } from '../../database/prisma.service';
import { ContaService } from '../../common/conta/conta.service';

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  imobiliaria: { findMany: jest.Mock };
  imovel: { findMany: jest.Mock };
  membro: { findMany: jest.Mock };
};

/**
 * Os argumentos de uma chamada do mock, tipados.
 *
 * `mock.calls[0][0]` é `any`, e o lint recusa acesso a membro de `any` — com razão:
 * um erro de digitação no nome do campo passaria como asserção que nunca falha.
 */
function argsDaChamada<T>(mock: jest.Mock, indice = 0): T {
  return (mock.mock.calls as unknown as T[][])[indice][0];
}

describe('PerfilService', () => {
  let service: PerfilService;
  let prisma: PrismaMock;
  let contaService: { resolve: jest.Mock };

  const userId = 1;
  const senhaAtual = 'senha123456';
  let hashAtual: string;

  // `password` entra aqui porque `update` agora confere a senha quando o e-mail muda.
  let usuario: {
    id: number;
    name: string;
    email: string;
    plano: string;
    password: string;
  };

  beforeAll(async () => {
    hashAtual = await bcrypt.hash(senhaAtual, 10);
    usuario = {
      id: userId,
      name: 'Maria',
      email: 'maria@example.com',
      plano: 'FREE',
      password: hashAtual,
    };
  });

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      imobiliaria: { findMany: jest.fn().mockResolvedValue([]) },
      imovel: { findMany: jest.fn().mockResolvedValue([]) },
      membro: { findMany: jest.fn().mockResolvedValue([]) },
    };
    contaService = {
      resolve: jest.fn().mockResolvedValue({ contaId: userId, papel: 'OWNER' }),
    };
    service = new PerfilService(
      prisma as unknown as PrismaService,
      contaService as unknown as ContaService,
    );
  });

  describe('update', () => {
    it('atualiza o nome e devolve o perfil no formato de /auth/me, sem password', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);
      prisma.user.update.mockResolvedValue({ ...usuario, name: 'Maria Silva' });

      const result = await service.update(userId, { name: 'Maria Silva' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { name: 'Maria Silva', email: undefined },
      });
      expect(result).toEqual({
        id: userId,
        name: 'Maria Silva',
        email: usuario.email,
        plano: 'FREE',
        contaId: userId,
        papel: 'OWNER',
        donoNome: undefined,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('atualiza o e-mail quando a senha confere e ninguém mais o usa', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(usuario) // carrega o próprio usuário
        .mockResolvedValueOnce(null); // ninguém usa o e-mail novo
      prisma.user.update.mockResolvedValue({
        ...usuario,
        email: 'novo@example.com',
      });

      const result = await service.update(userId, {
        email: 'novo@example.com',
        senhaAtual,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { name: undefined, email: 'novo@example.com' },
      });
      expect(result.email).toBe('novo@example.com');
    });

    it('recusa com 409 um e-mail já usado por outra pessoa', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(usuario)
        .mockResolvedValueOnce({ id: 99, email: 'ocupado@example.com' });

      await expect(
        service.update(userId, { email: 'ocupado@example.com', senhaAtual }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // O e-mail é o login e o único caminho de recuperação da conta; como não há
    // confirmação por link, a senha é a única prova de que é o dono trocando.
    it('exige a senha atual para trocar o e-mail', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);

      await expect(
        service.update(userId, { email: 'novo@example.com' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('recusa a troca de e-mail quando a senha está errada', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);

      await expect(
        service.update(userId, {
          email: 'novo@example.com',
          senhaAtual: 'errada',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // Só o nome mudando não é troca de e-mail, mesmo com o campo preenchido no corpo.
    it('não pede senha quando o e-mail enviado é o mesmo de hoje', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);
      prisma.user.update.mockResolvedValue({ ...usuario, name: 'Maria S.' });

      await expect(
        service.update(userId, { name: 'Maria S.', email: usuario.email }),
      ).resolves.toBeDefined();
    });

    // A tela manda o formulário inteiro mesmo quando só o nome mudou — reenviar o próprio
    // e-mail não pode ser tratado como conflito.
    it('aceita "trocar" para o e-mail que a própria pessoa já usa', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);
      prisma.user.update.mockResolvedValue(usuario);

      const result = await service.update(userId, { email: usuario.email });

      expect(result.email).toBe(usuario.email);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('updateSenha', () => {
    it('recusa com 401 quando a senha atual não confere', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...usuario,
        password: hashAtual,
      });

      await expect(
        service.updateSenha(userId, {
          senhaAtual: 'errada123',
          novaSenha: 'novasenha123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('recusa com 400 quando a nova senha é igual à atual', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...usuario,
        password: hashAtual,
      });

      await expect(
        service.updateSenha(userId, { senhaAtual, novaSenha: senhaAtual }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('grava o hash da nova senha quando a atual confere', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...usuario,
        password: hashAtual,
      });
      prisma.user.update.mockResolvedValue(usuario);

      await service.updateSenha(userId, {
        senhaAtual,
        novaSenha: 'novasenha123',
      });

      const [args] = prisma.user.update.mock.calls as [
        [{ where: { id: number }; data: { password: string } }],
      ];
      expect(args[0].where).toEqual({ id: userId });
      // Tem que ser hash, nunca a senha em texto puro — e um hash que o login consegue
      // conferir depois.
      expect(args[0].data.password).not.toBe('novasenha123');
      await expect(
        bcrypt.compare('novasenha123', args[0].data.password),
      ).resolves.toBe(true);
    });
  });

  // O JWT é stateless e dura 7 dias: sem este carimbo, um token vazado continuava
  // valendo mesmo depois de a vítima trocar a senha — justamente a ação que ela toma
  // para se proteger. A JwtStrategy compara o `iat` do token com esta data.
  describe('invalidação de sessões ao trocar a senha', () => {
    it('grava passwordChangedAt junto com o hash novo', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);
      prisma.user.update.mockResolvedValue(usuario);
      const antes = Date.now();

      await service.updateSenha(userId, {
        senhaAtual,
        novaSenha: 'novaSenha123',
      });

      const [[args]] = prisma.user.update.mock.calls as [
        [{ data: { password: string; passwordChangedAt: Date } }],
      ];
      expect(args.data.passwordChangedAt).toBeInstanceOf(Date);
      expect(args.data.passwordChangedAt.getTime()).toBeGreaterThanOrEqual(
        antes,
      );
      expect(args.data.password).not.toBe('novaSenha123');
    });

    it('avisa na resposta que as outras sessões caíram', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);
      prisma.user.update.mockResolvedValue(usuario);

      const resposta = await service.updateSenha(userId, {
        senhaAtual,
        novaSenha: 'novaSenha123',
      });

      expect(resposta.mensagem).toMatch(/sess/i);
    });
  });
  describe('exportarDados', () => {
    it('nunca inclui o hash da senha', async () => {
      // O select da query é a garantia; o teste existe para que acrescentar um campo
      // ao `select` um dia não traga `password` junto sem ninguém reparar.
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        name: usuario.name,
        email: usuario.email,
        plano: 'FREE',
        createdAt: new Date('2026-01-01'),
      });

      const dados = await service.exportarDados(userId);

      expect(JSON.stringify(dados)).not.toContain(hashAtual);
      expect(dados.perfil).not.toHaveProperty('password');
    });

    it('busca só o que pertence a este usuário, nunca a conta que ele acompanha', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        name: usuario.name,
        email: usuario.email,
        plano: 'FREE',
        createdAt: new Date('2026-01-01'),
      });

      await service.exportarDados(userId);

      // `userId`, e não `contaId`: um VISUALIZADOR da conta de outra pessoa não pode
      // baixar os dados dela por esta rota.
      expect(prisma.imobiliaria.findMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(
        argsDaChamada<{ where: unknown }>(prisma.imovel.findMany).where,
      ).toEqual({ userId });
      expect(
        argsDaChamada<{ where: unknown }>(prisma.membro.findMany).where,
      ).toEqual({
        donoId: userId,
      });
    });

    it('traz a árvore inteira: unidades, moradores, pagamentos, gastos e histórico', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        name: usuario.name,
        email: usuario.email,
        plano: 'FREE',
        createdAt: new Date('2026-01-01'),
      });

      await service.exportarDados(userId);

      const { include } = argsDaChamada<{
        include: {
          kitnets: {
            include: {
              moradores: { include: { pagamentos: boolean } };
              gastos: boolean;
              historicoValor: boolean;
            };
          };
        };
      }>(prisma.imovel.findMany);
      expect(include.kitnets.include.moradores.include.pagamentos).toBe(true);
      expect(include.kitnets.include.gastos).toBe(true);
      expect(include.kitnets.include.historicoValor).toBe(true);
    });
  });

  describe('apagarConta', () => {
    it('apaga o usuário quando a senha confere', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);
      prisma.user.delete.mockResolvedValue(usuario);

      await service.apagarConta(userId, { senhaAtual });

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('recusa e não apaga nada quando a senha está errada', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);

      await expect(
        service.apagarConta(userId, { senhaAtual: 'chute' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });
  describe('campos de apresentação', () => {
    it('apaga o telefone quando o campo chega vazio, em vez de ignorá-lo', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);
      prisma.user.update.mockResolvedValue(usuario);

      await service.update(userId, { telefone: '' });

      // `undefined` faria o Prisma não mexer na coluna; quem limpou o campo na tela
      // esperaria vê-lo limpo depois de recarregar.
      expect(
        argsDaChamada<{ data: { telefone?: string | null } }>(
          prisma.user.update,
        ).data.telefone,
      ).toBeNull();
    });

    it('deixa o telefone intacto quando o campo nem foi enviado', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);
      prisma.user.update.mockResolvedValue(usuario);

      await service.update(userId, { name: 'Maria Silva' });

      expect(
        argsDaChamada<{ data: { telefone?: string | null } }>(
          prisma.user.update,
        ).data.telefone,
      ).toBeUndefined();
    });
  });
});
