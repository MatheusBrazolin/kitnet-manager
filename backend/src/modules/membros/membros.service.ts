import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMembroDto } from './dto/create-membro.dto';

@Injectable()
export class MembrosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(donoId: number) {
    return this.prisma.membro.findMany({
      where: { donoId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** O convite pendente que este usuário recebeu, se houver — mostrado pra ele aceitar ou recusar. */
  findConvitePendente(userId: number) {
    return this.prisma.membro.findFirst({
      where: { userId, status: 'PENDENTE' },
      include: { dono: { select: { id: true, name: true, email: true } } },
    });
  }

  /**
   * Aceite do convidado. Só a partir daqui o ContaService passa a resolver a conta do
   * dono para esse usuário.
   */
  async aceitarConvite(userId: number) {
    const convite = await this.prisma.membro.findFirst({
      where: { userId, status: 'PENDENTE' },
    });
    if (!convite) {
      throw new NotFoundException('Você não tem nenhum convite pendente.');
    }

    // Recusar depois de já ter cadastrado imóveis próprios misturaria as duas contas —
    // a mesma checagem feita no convite, revalidada no aceite porque pode ter mudado
    // entre um e outro.
    const possuiDadosProprios = await this.prisma.imovel.count({
      where: { userId },
    });
    if (possuiDadosProprios > 0) {
      throw new ConflictException(
        'Você já tem imóveis próprios cadastrados. Para não misturar os dados, não é possível entrar em outra conta.',
      );
    }

    return this.prisma.membro.update({
      where: { id: convite.id },
      data: { status: 'ACEITO', aceitoEm: new Date() },
      include: { dono: { select: { id: true, name: true, email: true } } },
    });
  }

  /** Recusa do convidado — apaga a filiação pendente. */
  async recusarConvite(userId: number) {
    const convite = await this.prisma.membro.findFirst({
      where: { userId, status: 'PENDENTE' },
    });
    if (!convite) {
      throw new NotFoundException('Você não tem nenhum convite pendente.');
    }
    await this.prisma.membro.delete({ where: { id: convite.id } });
  }

  /**
   * Saída por iniciativa do próprio membro. Antes só o dono podia desfazer a filiação,
   * então quem fosse adicionado ficava preso à conta de outra pessoa sem nenhuma saída.
   */
  async sairDaConta(userId: number) {
    const filiacao = await this.prisma.membro.findUnique({ where: { userId } });
    if (!filiacao) {
      throw new NotFoundException('Você não é membro de nenhuma outra conta.');
    }
    await this.prisma.membro.delete({ where: { id: filiacao.id } });
  }

  async create(donoId: number, dto: CreateMembroDto) {
    const alvo = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!alvo) {
      throw new BadRequestException(
        'Não encontramos nenhuma conta com esse e-mail. A pessoa precisa criar uma conta antes de ser adicionada.',
      );
    }
    if (alvo.id === donoId) {
      throw new BadRequestException(
        'Você não pode se adicionar como membro da sua própria conta.',
      );
    }

    const filiacaoExistente = await this.prisma.membro.findUnique({
      where: { userId: alvo.id },
    });
    if (filiacaoExistente) {
      throw new ConflictException(
        filiacaoExistente.donoId === donoId
          ? 'Essa pessoa já é membro da sua conta.'
          : 'Essa pessoa já é membro de outra conta e não pode ser adicionada aqui.',
      );
    }

    const possuiDadosProprios = await this.prisma.imovel.count({
      where: { userId: alvo.id },
    });
    if (possuiDadosProprios > 0) {
      throw new BadRequestException(
        'Essa pessoa já tem imóveis próprios cadastrados. Para não misturar ou esconder os dados dela, não é possível adicioná-la como membro de outra conta.',
      );
    }

    // Nasce PENDENTE: a filiação só passa a valer quando a pessoa aceita.
    return this.prisma.membro.create({
      data: { donoId, userId: alvo.id, papel: dto.papel, status: 'PENDENTE' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(donoId: number, id: number) {
    const membro = await this.prisma.membro.findUnique({ where: { id } });
    if (!membro) {
      throw new NotFoundException('Membro não encontrado');
    }
    if (membro.donoId !== donoId) {
      throw new ForbiddenException('Você não tem acesso a este membro');
    }
    await this.prisma.membro.delete({ where: { id } });
  }
}
