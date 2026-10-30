/**
 * Quem responde pelo serviço, do ponto de vista legal.
 *
 * ⚠️ PREENCHER ANTES DE ABRIR O APP AO PÚBLICO. Os valores abaixo são marcadores:
 * a LGPD (art. 9º, I e III) exige que o titular saiba quem é o controlador e como
 * falar com ele, e os Termos sem uma parte identificada não obrigam ninguém.
 *
 * Fica num arquivo só porque as duas páginas legais e o rodapé leem daqui — assim
 * trocar o e-mail de contato é uma edição, não quatro.
 */
export const RESPONSAVEL = {
  /** Razão social ou nome completo de quem opera o serviço. */
  nome: '[PREENCHER: razão social ou seu nome completo]',
  /** CNPJ, ou CPF se você operar como pessoa física. */
  documento: '[PREENCHER: CNPJ ou CPF]',
  /** Para onde vão pedidos de privacidade e suporte. Precisa ser lido por alguém. */
  email: '[PREENCHER: e-mail de contato]',
  /** Cidade/UF — define o foro citado nos Termos. */
  cidade: '[PREENCHER: cidade/UF]',
} as const;

/** Última revisão do texto, mostrada no topo das duas páginas. */
export const ATUALIZADO_EM = '30 de outubro de 2026';

/**
 * Serviços de terceiros que processam dados em nome do app.
 *
 * A LGPD não obriga a listar nome por nome, mas obriga a informar o compartilhamento
 * (art. 9º, V). Listar é mais honesto e evita reescrever a política toda vez que
 * alguém pergunta onde o dado mora.
 */
export const SUBPROCESSADORES = [
  {
    nome: 'Vercel',
    papel: 'Hospeda o site e a API.',
    onde: 'Estados Unidos',
  },
  {
    nome: 'Supabase',
    papel: 'Banco de dados onde ficam os seus registros.',
    onde: 'Estados Unidos',
  },
  {
    nome: 'Resend',
    papel: 'Envia os e-mails de recuperação de senha e convite.',
    onde: 'Estados Unidos',
  },
] as const;
