import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../common/email/email.service';

const SALT_ROUNDS = 10;
/** Uma hora: tempo de sobra para abrir o e-mail, curto para um link vazado. */
const VALIDADE_MS = 60 * 60 * 1000;

/** Hash do token. Guardamos só isto; o token em claro só existe no e-mail. */
function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class RecuperacaoService {
  private readonly logger = new Logger(RecuperacaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Primeira etapa: a pessoa informa o e-mail e recebe o link.
   *
   * Responde a mesma coisa exista ou não a conta. Dizer "e-mail não encontrado"
   * transformaria esta rota num verificador de cadastro: qualquer um poderia descobrir
   * quem tem conta aqui testando endereços.
   */
  async solicitar(email: string, baseUrl: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return;
    }

    // Invalida os pedidos anteriores: com vários links válidos ao mesmo tempo, basta
    // um e-mail antigo vazar para a conta continuar exposta.
    await this.prisma.tokenRecuperacao.updateMany({
      where: { userId: user.id, usadoEm: null },
      data: { usadoEm: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    await this.prisma.tokenRecuperacao.create({
      data: {
        tokenHash: hashDoToken(token),
        expiraEm: new Date(Date.now() + VALIDADE_MS),
        userId: user.id,
      },
    });

    const link = `${baseUrl}/redefinir-senha?token=${token}`;

    const enviado = await this.email.enviar({
      para: user.email,
      assunto: 'Redefinir sua senha do KitManager',
      texto: [
        `Olá, ${user.name}.`,
        '',
        'Você pediu para redefinir a senha do KitManager. Abra o link abaixo:',
        link,
        '',
        'O link vale por 1 hora e só pode ser usado uma vez.',
        'Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.',
      ].join('\n'),
      html: `
        <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;color:#201f1c">
          <p>Olá, ${user.name}.</p>
          <p>Você pediu para redefinir a senha do KitManager.</p>
          <p>
            <a href="${link}" style="display:inline-block;background:#9a4b1e;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
              Criar uma senha nova
            </a>
          </p>
          <p style="color:#6b675d;font-size:14px">
            O link vale por 1 hora e só pode ser usado uma vez.<br>
            Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.
          </p>
        </div>`,
    });

    if (!enviado) {
      // Sem provedor configurado o link morreria aqui e o fluxo ficaria impossível de
      // testar. Em produção isto não aparece: lá a chave existe. Fica em `warn` com o
      // link inteiro justamente para ser achável no log de desenvolvimento.
      this.logger.warn(`Link de recuperação (e-mail não enviado): ${link}`);
    }
  }

  /**
   * Segunda etapa: o token do link vira uma senha nova.
   *
   * Grava `passwordChangedAt` junto, o que derruba as sessões abertas — se a conta foi
   * invadida, redefinir a senha precisa expulsar quem estava dentro.
   */
  async redefinir(token: string, novaSenha: string): Promise<void> {
    const registro = await this.prisma.tokenRecuperacao.findUnique({
      where: { tokenHash: hashDoToken(token) },
      include: { user: true },
    });

    // Mensagem única para "não existe", "já usado" e "vencido": separar as três diria a
    // quem está tentando adivinhar quais tokens já existiram.
    const invalido = new BadRequestException(
      'Este link não vale mais. Peça um novo para redefinir sua senha.',
    );

    if (
      !registro ||
      registro.usadoEm ||
      registro.expiraEm.getTime() < Date.now()
    ) {
      throw invalido;
    }

    const hash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
    const agora = new Date();

    // Numa transação: marcar o token como usado e trocar a senha precisam acontecer
    // juntos, ou um erro no meio deixaria o link válido com a senha já trocada.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: registro.userId },
        data: { password: hash, passwordChangedAt: agora },
      }),
      this.prisma.tokenRecuperacao.update({
        where: { id: registro.id },
        data: { usadoEm: agora },
      }),
    ]);
  }

  /**
   * Diz se um token ainda serve, para a tela não pedir a senha nova e só então avisar
   * que o link venceu.
   */
  async conferir(token: string): Promise<boolean> {
    const registro = await this.prisma.tokenRecuperacao.findUnique({
      where: { tokenHash: hashDoToken(token) },
    });
    return Boolean(
      registro &&
      !registro.usadoEm &&
      registro.expiraEm.getTime() >= Date.now(),
    );
  }
}
