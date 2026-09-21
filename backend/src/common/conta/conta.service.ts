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
   *
   * Um convite ainda PENDENTE não muda nada: enquanto a pessoa não aceita, ela continua
   * operando na própria conta. Antes de existir esse estado, bastava o dono adicionar um
   * e-mail para o convidado ser jogado na conta dele no login seguinte — e tudo que o
   * convidado cadastrasse passava a ser gravado na conta do outro, sem ele poder sair.
   */
  async resolve(userId: number): Promise<ContaInfo> {
    const membro = await this.prisma.membro.findUnique({
      where: { userId },
      include: { dono: true },
    });

    if (!membro || membro.status !== 'ACEITO') {
      return { contaId: userId, papel: 'OWNER' };
    }

    return {
      contaId: membro.donoId,
      papel: membro.papel,
      donoNome: membro.dono.name,
    };
  }
}
