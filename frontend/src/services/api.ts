import axios from 'axios';
import { captureException } from './sentry';

const TOKEN_STORAGE_KEY = 'kitmanager.token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Só reporta falha de rede (sem resposta) ou erro inesperado do servidor (5xx) —
    // erro de validação/negócio (4xx) é fluxo normal da UI, não uma falha da aplicação.
    if (!error.response || error.response.status >= 500) {
      captureException(error);
    }
    return Promise.reject(error);
  },
);

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Mensagem de erro pra mostrar ao usuário.
 *
 * O `fallback` que cada tela passa descreve o que *aquela ação* queria fazer
 * ("Não foi possível entrar. Verifique suas credenciais."). Isso só é verdade
 * quando o backend de fato respondeu e recusou. Quando a API está fora do ar ou
 * devolve 5xx, usar esse texto vira mentira: já aconteceu de a tela de login
 * acusar senha errada enquanto a função do backend estava caída em produção —
 * o usuário fica tentando trocar a senha de um sistema que nem respondeu.
 *
 * Por isso falha de infraestrutura tem texto próprio, que diz onde está o
 * problema e que não adianta mexer no que ele digitou.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  // Sem `response`: a requisição não chegou a ter resposta — rede caída, DNS,
  // CORS bloqueado pelo navegador ou a função do servidor morrendo antes de
  // responder.
  if (!error.response) {
    return 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.';
  }

  // 5xx é falha do nosso lado. O corpo pode até trazer um `message`, mas é
  // sempre genérico ("Internal server error") ou um texto que não é do NestJS
  // (a Vercel responde texto puro quando a função nem sobe).
  if (error.response.status >= 500) {
    return 'O servidor falhou ao responder. Não é problema no que você digitou — tente de novo em instantes.';
  }

  const data = error.response.data as { message?: string | string[] } | undefined;
  if (Array.isArray(data?.message)) {
    return data.message.join(', ');
  }
  if (typeof data?.message === 'string') {
    return data.message;
  }
  return fallback;
}
