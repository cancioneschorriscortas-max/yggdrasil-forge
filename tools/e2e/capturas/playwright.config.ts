import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// ── Config do xerador de capturas (17.5) ──
// Mesmo patrón có E2E do Tester (porto fixo 5199, viewport 1440×900,
// un só worker) pero AUTOCONTIDO: este directorio SI se commitea
// (excepción no .gitignore) porque as capturas son documentación e o
// script é a única forma lexítima de producilas.
const editorDir = path.resolve(__dirname, '../../../examples/editor')
const PORT = 5199

export default defineConfig({
  testDir: '.',
  testMatch: 'generate.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  outputDir: 'resultados',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    cwd: editorDir,
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
