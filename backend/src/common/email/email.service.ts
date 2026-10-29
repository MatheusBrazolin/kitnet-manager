import { Injectable, Logger } from '@nestjs/common';

/**
 * Envio de e-mail transacional pela API HTTP da Resend.
 *
 * Usa `fetch` direto em vez do SDK: é uma requisição POST com JSON, e uma dependência
 * a menos é uma dependência a menos para auditar e atualizar.
 *
 * Como o Sentry neste projeto, é **opt-in**: sem `RESEND_API_KEY` o serviço não envia
 * nada e diz isso no log. Isso mantém o fluxo de recuperação testável localmente e na
 * CI sem conta em provedor nenhum — em desenvolvimento o link vai para o log, que é
 * onde você vai buscá-lo enquanto o provedor não estiver configurado.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private get apiKey(): string | undefined {
    return process.env.RESEND_API_KEY;
  }

  get habilitado(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Manda o e-mail e diz se conseguiu.
   *
   * Nunca lança: quem chama é o fluxo de "esqueci minha senha", que responde a mesma
   * coisa com e-mail existente ou não (para não revelar quem tem conta). Se uma falha
   * de envio virasse exceção, o erro 500 entregaria justamente essa informação.
   */
  async enviar(params: {
    para: string;
    assunto: string;
    html: string;
    texto: string;
  }): Promise<boolean> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY não configurada — e-mail "${params.assunto}" não foi enviado para ${params.para}.`,
      );
      return false;
    }

    try {
      const resposta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:
            process.env.EMAIL_REMETENTE ?? 'KitManager <onboarding@resend.dev>',
          to: [params.para],
          subject: params.assunto,
          html: params.html,
          text: params.texto,
        }),
      });

      if (!resposta.ok) {
        // O corpo da Resend diz o motivo (domínio não verificado, chave inválida...),
        // e sem ele o log viraria só "falhou".
        const detalhe = await resposta.text().catch(() => '');
        this.logger.error(
          `Resend recusou o envio (${resposta.status}): ${detalhe.slice(0, 500)}`,
        );
        return false;
      }

      return true;
    } catch (erro) {
      this.logger.error(
        'Falha de rede ao falar com a Resend',
        erro instanceof Error ? erro.stack : String(erro),
      );
      return false;
    }
  }
}
