import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// @testing-library/react não faz cleanup automático fora do Jest — sem isso, cada teste
// deixa o DOM do anterior montado, e queries tipo getByRole passam a achar múltiplos
// elementos (um por teste já rodado).
afterEach(() => {
  cleanup();
});
