import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // Läser .env (och variabler som redan är satta i terminalen/CI). Tredje argumentet ''
  // betyder "alla variabler, inte bara VITE_*". De används bara här, i Node – de hamnar
  // aldrig i koden som skickas till browsern. Det gör bara VITE_-variabler.
  const env = loadEnv(mode, process.cwd(), '')

  // /api → mock-API:t med nyckeln påsatt – samma jobb som nginx gör i containern
  const apiProxy = {
    '/api': {
      target: env.API_URL || 'http://localhost:4000',
      changeOrigin: true,
      headers: { 'X-Api-Key': env.API_KEY || '' }
    }
  }

  return {
    plugins: [vue()],
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
    test: {
      globals: true, // krävs för att Testing Library ska städa DOM:en mellan tester
      environment: 'jsdom',
      setupFiles: ['./tests/setup.js'],
      include: ['src/**/*.test.js'] // Playwright-filerna i e2e/ och API-testerna i mock-api/ körs inte av Vitest
    }
  }
})
