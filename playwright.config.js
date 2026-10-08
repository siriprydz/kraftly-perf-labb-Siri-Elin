import { defineConfig } from '@playwright/test'

// Lokalt: dev-servern (hot reload). I CI (E2E_SERVER=preview): vite preview på den
// byggda dist/-katalogen – samma filer som senare deployas.
const appServer =
  process.env.E2E_SERVER === 'preview'
    ? { command: 'npm run preview -- --port 5173 --strictPort', url: 'http://localhost:5173' }
    : { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true }

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    { command: 'npm run api', url: 'http://localhost:4000/healthz', reuseExistingServer: true },
    appServer
  ]
})
