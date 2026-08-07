import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async create(donoId: number, dto: CreateMembroDto) {
    const alvo = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!alvo) {
      throw new BadRequestException('Não encontramos nenhuma conta com esse e-mail. A pessoa precisa criar uma conta antes de ser adicionada.');
    }
    if (alvo.id === donoId) {
      throw new BadRequestException('Você não pode se adicionar como membro da sua própria conta.');
    }

    const filiacaoExistente = await this.prisma.membro.findUnique({ where: { userId: alvo.id } });
    if (filiacaoExistente) {
      throw new ConflictException(
        filiacaoExistente.donoId === donoId
          ? 'Essa pessoa já é membro da sua conta.'
          : 'Essa pessoa já é membro de outra conta e não pode ser adicionada aqui.',
      );
    }

    const possuiDadosProprios = await this.prisma.imovel.count({ where: { userId: alvo.id } });
    if (possuiDadosProprios > 0) {
      throw new BadRequestException(
        'Essa pessoa já tem imóveis próprios cadastrados. Para não misturar ou esconder os dados dela, não é possível adicioná-la como membro de outra conta.',
      );
    }

    return this.prisma.membro.create({
      data: { donoId, userId: alvo.id, papel: dto.papel },
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
