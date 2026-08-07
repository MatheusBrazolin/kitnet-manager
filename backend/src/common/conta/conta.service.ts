import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type Papel = 'OWNER' | 'GERENTE' | 'VISUALIZADOR';

export interface ContaInfo {
  contaId: number;
  papel: Papel;
  donoNome?: string;
}

@Injectable()
export class ContaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve de quem são os dados que este usuário deve ver/editar.
   * Um usuário "dono" (sem filiação) opera na própria conta (contaId = seu id).
   * Um usuário "membro" opera na conta de quem o convidou (contaId = donoId),
   * com o papel (GERENTE ou VISUALIZADOR) definido no convite.
   */
  async resolve(userId: number): Promise<ContaInfo> {
    const membro = await this.prisma.membro.findUnique({
      where: { userId },
      include: { dono: true },
    });

    if (!membro) {
      return { contaId: userId, papel: 'OWNER' };
    }

    return { contaId: membro.donoId, papel: membro.papel, donoNome: membro.dono.name };
  }
}
