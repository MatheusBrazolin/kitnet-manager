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

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) {
      return data.message.join(', ');
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }
  }
  return fallback;
}
