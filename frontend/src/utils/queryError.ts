import { getApiErrorMessage } from '../services/api';

interface QueryErrorEntry {
  error: unknown;
  fallback: string;
}

// Substitui a cadeia de ternários repetida em cada página (`listError ?? (errorA ? ... : errorB ? ... : null)`)
// por uma única chamada: retorna a mensagem da primeira entrada com erro, ou null se nenhuma tiver.
export function firstErrorMessage(...entries: QueryErrorEntry[]): string | null {
  for (const entry of entries) {
    if (entry.error) {
      return getApiErrorMessage(entry.error, entry.fallback);
    }
  }
  return null;
}
