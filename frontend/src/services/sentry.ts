import * as Sentry from '@sentry/react';

let initialized = false;

// Opt-in: sem VITE_SENTRY_DSN definido, o Sentry nunca é inicializado e essa tela
// fica exatamente como hoje. Basta criar uma conta em sentry.io e definir a env var
// (build time, via .env do frontend ou nas Environment Variables da Vercel).
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return;
  }
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function captureException(error: unknown): void {
  if (!initialized) {
    return;
  }
  Sentry.captureException(error);
}
