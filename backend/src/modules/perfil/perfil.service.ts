import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { ContaService } from '../../common/conta/conta.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { UpdateSenhaDto } from './dto/update-senha.dto';

// Mesmo custo usado no cadastro (auth.service.ts). Precisa bater: o hash gravado aqui é
// conferido pelo mesmo bcrypt.compare do login.
const SALT_ROUNDS = 10;

@Injectable()
export class PerfilService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contaService: ContaService,
  ) {}

  /**
   * Edita os dados da PESSOA autenticada (tabela User), não os da conta de dados que ela
   * acompanha — por isso tudo aqui é chaveado por `userId`, nunca por `contaId`.
   */
  async update(
    userId: number,
    dto: UpdatePerfilDto,
  ): Promise<AuthenticatedUser> {
    if (dto.email !== undefined) {
      const existente = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      // Reenviar o próprio e-mail atual não é conflito: a tela de configurações manda o
      // formulário inteiro mesmo quando só o nome mudou.
      if (existente && existente.id !== userId) {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }
    }

    // O filtro global já mapeia P2002 → 409, mas com mensagem genérica ("Já existe um
    // registro com esses dados."); a checagem acima existe para a pessoa saber que o
    // problema é o e-mail. O mapeamento do filtro continua valendo como rede de
    // segurança para a corrida entre a checagem e o update.
    const user = await this.prisma.user.update({
      where: { id: userId },
      // Campos ausentes chegam como undefined e o Prisma simplesmente não os altera.
      data: { name: dto.name, email: dto.email },
    });

    return this.montarPerfil(user);
  }

  async updateSenha(userId: number, dto: UpdateSenhaDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const senhaConfere = await bcrypt.compare(dto.senhaAtual, user.password);
    if (!senhaConfere) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }

    // Comparado contra o hash, e não contra `senhaAtual`: assim a regra vale mesmo que a
    // pessoa tenha errado o campo da senha atual de um jeito que ainda assim valide.
    const igualAAtual = await bcrypt.compare(dto.novaSenha, user.password);
    if (igualAAtual) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual.',
      );
    }

    const hash = await bcrypt.hash(dto.novaSenha, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    return { mensagem: 'Senha alterada com sucesso.' };
  }

  /** Mesmo shape devolvido por GET /auth/me (ver jwt.strategy.ts) — e sem `password`. */
  private async montarPerfil(user: {
    id: number;
    name: string;
    email: string;
    plano: string;
  }): Promise<AuthenticatedUser> {
    const conta = await this.contaService.resolve(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      plano: user.plano,
      contaId: conta.contaId,
      papel: conta.papel,
      donoNome: conta.donoNome,
    };
  }
}
