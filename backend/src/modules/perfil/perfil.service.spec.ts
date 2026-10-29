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
  };
};

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
      user: { findUnique: jest.fn(), update: jest.fn() },
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
});
