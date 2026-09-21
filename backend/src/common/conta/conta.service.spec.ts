import { ContaService } from './conta.service';
import { PrismaService } from '../../database/prisma.service';

type PrismaMock = {
  membro: { findUnique: jest.Mock };
};

describe('ContaService', () => {
  let service: ContaService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = { membro: { findUnique: jest.fn() } };
    service = new ContaService(prisma as unknown as PrismaService);
  });

  describe('resolve', () => {
    it("returns OWNER on the user's own account when there is no filiação", async () => {
      prisma.membro.findUnique.mockResolvedValue(null);

      const result = await service.resolve(1);

      expect(result).toEqual({ contaId: 1, papel: 'OWNER' });
    });

    it('returns the donoId/papel/donoNome when the user is a member of another account', async () => {
      prisma.membro.findUnique.mockResolvedValue({
        donoId: 5,
        papel: 'GERENTE',
        status: 'ACEITO',
        dono: { name: 'Dona Conta' },
      });

      const result = await service.resolve(2);

      expect(result).toEqual({
        contaId: 5,
        papel: 'GERENTE',
        donoNome: 'Dona Conta',
      });
    });

    // Regressão de segurança: antes, bastava o dono adicionar um e-mail para o
    // convidado ser jogado na conta dele no login seguinte — e tudo que o convidado
    // cadastrasse passava a ser gravado na conta do outro.
    it('ignores a PENDENTE invitation and keeps the user on their own account', async () => {
      prisma.membro.findUnique.mockResolvedValue({
        donoId: 5,
        papel: 'GERENTE',
        status: 'PENDENTE',
        dono: { name: 'Dona Conta' },
      });

      const result = await service.resolve(9);

      expect(result).toEqual({ contaId: 9, papel: 'OWNER' });
    });

    it('propagates the VISUALIZADOR papel from the membership', async () => {
      prisma.membro.findUnique.mockResolvedValue({
        donoId: 5,
        papel: 'VISUALIZADOR',
        status: 'ACEITO',
        dono: { name: 'Dona Conta' },
      });

      const result = await service.resolve(3);

      expect(result.papel).toBe('VISUALIZADOR');
      expect(result.contaId).toBe(5);
    });
  });
});
