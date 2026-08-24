// Efeito colateral puro: inicializa o Sentry (se SENTRY_DSN estiver definido) assim que
// este módulo é importado. Precisa ser o primeiro import de `main.ts`, antes de qualquer
// outro módulo da aplicação, pra capturar erro de bootstrap também.
import { initSentry } from './sentry';

initSentry();
