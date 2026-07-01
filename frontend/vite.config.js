import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Em produção o Django serve os assets a partir de /static/; em dev
  // isso quebraria a navegação do React Router, então só se aplica ao build.
  base: command === 'build' ? '/static/' : '/',
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/static': 'http://127.0.0.1:8000',
    },
  },
}))
