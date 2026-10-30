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
import { ApagarContaDto } from './dto/apagar-conta.dto';

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
    const atual = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!atual) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const trocandoEmail = dto.email !== undefined && dto.email !== atual.email;

    if (trocandoEmail) {
      // O e-mail é o login e o único caminho de recuperação da conta. Como ainda não
      // há confirmação por link, a senha atual é a prova de identidade — sem ela, um
      // token vazado trocaria o e-mail e a pessoa perderia a conta em silêncio.
      if (!dto.senhaAtual) {
        throw new BadRequestException(
          'Para trocar o e-mail, confirme sua senha atual.',
        );
      }
      const senhaConfere = await bcrypt.compare(dto.senhaAtual, atual.password);
      if (!senhaConfere) {
        throw new UnauthorizedException('Senha atual incorreta.');
      }

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
      data: {
        password: hash,
        // Carimbo lido pela JwtStrategy: todo token emitido antes deste instante
        // deixa de valer, derrubando sessões abertas em outros aparelhos.
        passwordChangedAt: new Date(),
      },
    });

    return {
      mensagem:
        'Senha alterada. As sessões abertas em outros aparelhos foram encerradas.',
    };
  }

  /**
   * Tudo que a conta guarda, num JSON só — o direito de portabilidade da LGPD
   * (art. 18, V) e, na prática, a única cópia de segurança que o usuário consegue
   * tirar sozinho.
   *
   * Chaveado por `userId` e não por `contaId` de propósito: exporta o que esta pessoa
   * é dona, nunca os dados da conta de terceiro que ela porventura acompanhe como
   * membro. `password` nunca entra — é hash, não serve a ninguém e só aumenta o
   * estrago se o arquivo vazar.
   */
  async exportarDados(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        plano: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Os imóveis puxam a árvore inteira: unidade → morador → pagamento, mais os gastos
    // e o histórico de valor de cada unidade. Como toda kitnet pertence a um imóvel,
    // nada fica de fora por este caminho.
    const [imobiliarias, imoveis, membros] = await Promise.all([
      this.prisma.imobiliaria.findMany({ where: { userId } }),
      this.prisma.imovel.findMany({
        where: { userId },
        include: {
          kitnets: {
            include: {
              moradores: { include: { pagamentos: true } },
              gastos: true,
              historicoValor: true,
            },
          },
        },
      }),
      this.prisma.membro.findMany({
        where: { donoId: userId },
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    return {
      geradoEm: new Date().toISOString(),
      perfil: user,
      imobiliarias,
      imoveis,
      // Quem tem acesso à conta também é informação da conta, e some junto se ela for
      // apagada — então precisa aparecer na cópia.
      membros,
    };
  }

  /**
   * Apaga a conta e, em cascata, tudo que pende dela — o direito de eliminação da
   * LGPD (art. 18, VI).
   *
   * Uma linha só: o schema declara `onDelete: Cascade` de `User` para baixo, então o
   * próprio banco remove imóveis, unidades, moradores, pagamentos, gastos, convites e
   * tokens de recuperação. Fazer isso na mão aqui seria repetir — e divergir — de uma
   * regra que já existe e é garantida pelo Postgres.
   */
  async apagarConta(userId: number, dto: ApagarContaDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const senhaConfere = await bcrypt.compare(dto.senhaAtual, user.password);
    if (!senhaConfere) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }

    await this.prisma.user.delete({ where: { id: userId } });

    return { mensagem: 'Conta apagada. Sentiremos sua falta.' };
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
