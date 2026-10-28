import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaxaTipo } from '@prisma/client';
import { ImobiliariasService } from './imobiliarias.service';
import { PrismaService } from '../../database/prisma.service';

type PrismaMock = {
  imobiliaria: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('ImobiliariasService', () => {
  let service: ImobiliariasService;
  let prisma: PrismaMock;

  const ownerId = 1;
  const outroDono = 2;
  const imobiliaria = {
    id: 10,
    nome: 'Imobiliária Central',
    telefone: '11999990000',
    contato: 'Marina',
    taxaPadraoTipo: TaxaTipo.PERCENTUAL,
    taxaPadraoValor: 10,
    userId: ownerId,
    _count: { kitnets: 0 },
  };

  beforeEach(() => {
    prisma = {
      imobiliaria: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ImobiliariasService(prisma as unknown as PrismaService);
  });

  describe('findOwnedOrThrow', () => {
    it('devolve a imobiliária quando ela é da conta', async () => {
      prisma.imobiliaria.findUnique.mockResolvedValue(imobiliaria);

      await expect(
        service.findOwnedOrThrow(ownerId, imobiliaria.id),
      ).resolves.toEqual(imobiliaria);
    });

    it('404 quando não existe', async () => {
      prisma.imobiliaria.findUnique.mockResolvedValue(null);

      await expect(
        service.findOwnedOrThrow(ownerId, imobiliaria.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('403 quando existe mas é de outra conta', async () => {
      prisma.imobiliaria.findUnique.mockResolvedValue({
        ...imobiliaria,
        userId: outroDono,
      });

      await expect(
        service.findOwnedOrThrow(ownerId, imobiliaria.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('lista só as da conta, em ordem alfabética', async () => {
      prisma.imobiliaria.findMany.mockResolvedValue([imobiliaria]);

      await service.findAll(ownerId);

      expect(prisma.imobiliaria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: ownerId },
          orderBy: { nome: 'asc' },
        }),
      );
    });
  });

  describe('create', () => {
    it('grava com o userId da conta, ignorando qualquer coisa vinda do corpo', async () => {
      prisma.imobiliaria.create.mockResolvedValue(imobiliaria);

      await service.create(ownerId, {
        nome: 'Imobiliária Central',
        telefone: '11999990000',
        taxaPadraoTipo: TaxaTipo.PERCENTUAL,
        taxaPadraoValor: 10,
      });

      const [[args]] = prisma.imobiliaria.create.mock.calls as [
        [{ data: { userId: number; nome: string } }],
      ];
      expect(args.data.userId).toBe(ownerId);
      expect(args.data.nome).toBe('Imobiliária Central');
    });
  });

  describe('update', () => {
    it('recusa editar imobiliária de outra conta, sem escrever nada', async () => {
      prisma.imobiliaria.findUnique.mockResolvedValue({
        ...imobiliaria,
        userId: outroDono,
      });

      await expect(
        service.update(ownerId, imobiliaria.id, { nome: 'Invadida' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.imobiliaria.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('exclui quando não há unidades vinculadas', async () => {
      prisma.imobiliaria.findUnique.mockResolvedValue(imobiliaria);

      await service.remove(ownerId, imobiliaria.id);

      expect(prisma.imobiliaria.delete).toHaveBeenCalledWith({
        where: { id: imobiliaria.id },
      });
    });

    // A FK é SetNull: sem esta guarda, o banco deixaria apagar e as unidades virariam
    // "gestão direta" sem ninguém perceber.
    it('bloqueia com 409 quando ainda há unidades vinculadas', async () => {
      prisma.imobiliaria.findUnique.mockResolvedValue({
        ...imobiliaria,
        _count: { kitnets: 4 },
      });

      await expect(
        service.remove(ownerId, imobiliaria.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.imobiliaria.delete).not.toHaveBeenCalled();
    });

    it('recusa excluir imobiliária de outra conta', async () => {
      prisma.imobiliaria.findUnique.mockResolvedValue({
        ...imobiliaria,
        userId: outroDono,
      });

      await expect(
        service.remove(ownerId, imobiliaria.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.imobiliaria.delete).not.toHaveBeenCalled();
    });
  });
});
