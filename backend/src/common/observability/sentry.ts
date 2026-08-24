import * as Sentry from '@sentry/node';

let initialized = false;

// Sentry é totalmente opt-in: sem SENTRY_DSN no ambiente, `init()` não faz nada e
// `captureException`/`isEnabled` continuam seguros de chamar (no-op). Isso deixa o
// código já pronto pra produção sem exigir uma conta Sentry pra rodar localmente ou na CI.
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function isSentryEnabled(): boolean {
  return initialized;
}

// Exportado só pra teste: `initialized` é estado de módulo (não há um "app" pra
// recriar entre casos de teste), então precisamos de um jeito explícito de zerar.
export function resetSentryForTests(): void {
  initialized = false;
}

export function captureException(error: unknown): void {
  if (!initialized) {
    return;
  }
  Sentry.captureException(error);
}
