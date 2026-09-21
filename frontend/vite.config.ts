import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// O app é usado no Brasil e lida o tempo todo com datas de calendário (vencimento, data
// de entrada, competência). Sem fixar o fuso, os testes rodam em UTC no CI e em
// America/Sao_Paulo na máquina de quem desenvolve — e bugs de "um dia a mais/a menos"
// passam despercebidos justamente onde mais doem. Precisa ser antes de qualquer Date.
process.env.TZ = 'America/Sao_Paulo'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
