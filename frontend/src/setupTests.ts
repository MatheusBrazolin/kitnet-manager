import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

/**
 * `localStorage` em memória.
 *
 * O jsdom desta configuração não traz `localStorage` — `typeof localStorage` é
 * "undefined", mesmo com a URL definida. Como o app guarda o token de sessão e o
 * perfil lembrado ali, nenhum teste conseguia exercitar esses caminhos: ou o código
 * engolia o erro num try/catch, ou quebraria num TypeError.
 *
 * Esta implementação mínima faz os testes enxergarem o que o navegador enxerga.
 */
class MemoriaStorage implements Storage {
  private dados = new Map<string, string>();

  get length() {
    return this.dados.size;
  }

  clear() {
    this.dados.clear();
  }

  getItem(chave: string) {
    return this.dados.get(chave) ?? null;
  }

  key(indice: number) {
    return [...this.dados.keys()][indice] ?? null;
  }

  removeItem(chave: string) {
    this.dados.delete(chave);
  }

  setItem(chave: string, valor: string) {
    this.dados.set(chave, String(valor));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoriaStorage(),
    writable: true,
  });
}

// Estado entre testes é o tipo de acoplamento que faz um teste passar sozinho e
// falhar na suíte.
beforeEach(() => {
  localStorage.clear();
});

// @testing-library/react não faz cleanup automático fora do Jest — sem isso, cada teste
// deixa o DOM do anterior montado, e queries tipo getByRole passam a achar múltiplos
// elementos (um por teste já rodado).
afterEach(() => {
  cleanup();
});
