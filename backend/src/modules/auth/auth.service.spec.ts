import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ContaService } from '../../common/conta/conta.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: { findByEmail: jest.Mock; create: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let contaService: { resolve: jest.Mock };

  const existingUser = {
    id: 1,
    name: 'Maria',
    email: 'maria@example.com',
    password: 'hashed-password',
    plano: 'FREE',
  };

  beforeEach(() => {
    usersService = { findByEmail: jest.fn(), create: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    contaService = { resolve: jest.fn().mockResolvedValue({ contaId: existingUser.id, papel: 'OWNER' }) };

    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      contaService as unknown as ContaService,
    );
  });

  describe('register', () => {
    it('throws ConflictException when email is already in use', async () => {
      usersService.findByEmail.mockResolvedValue(existingUser);

      await expect(
        authService.register({ name: 'Maria', email: existingUser.email, password: 'senha123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password and returns a token with the new user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(existingUser);

      const result = await authService.register({
        name: existingUser.name,
        email: existingUser.email,
        password: 'senha123',
      });

      const [createArgs] = usersService.create.mock.calls[0] as [{ password: string }];
      expect(await bcrypt.compare('senha123', createArgs.password)).toBe(true);
      expect(result).toEqual({
        token: 'signed-token',
        user: {
          id: 1,
          name: 'Maria',
          email: 'maria@example.com',
          plano: 'FREE',
          contaId: 1,
          papel: 'OWNER',
          donoNome: undefined,
        },
      });
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nope@example.com', password: 'senha123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(existingUser);

      await expect(
        authService.login({ email: existingUser.email, password: 'senha-errada' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns a token when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      usersService.findByEmail.mockResolvedValue({ ...existingUser, password: hashedPassword });

      const result = await authService.login({ email: existingUser.email, password: 'senha123' });

      expect(result.token).toBe('signed-token');
      expect(result.user.email).toBe(existingUser.email);
    });
  });
});
