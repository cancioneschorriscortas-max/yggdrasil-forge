// ── INICIO: vitest config raíz ──
// Configuración base de Vitest para o workspace.
// Cada paquete pode ter o seu propio vitest.config.ts que extenda este.

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Globals desactivado: imports explícitos de describe/it/expect
    // Mellor para tree-shaking e claridade
    globals: false,

    // Entorno por defecto: node
    // Os paquetes que precisen DOM (react, editor) sobrescriben a 'jsdom'
    environment: 'node',

    // Patróns de tests
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.turbo/**', '**/coverage/**'],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.{ts,js,mjs}',
        '**/index.ts',
      ],
      // Thresholds aplican cando haxa código real
      // (de momento desactivados para non bloquear)
    },

    // Reporters
    reporters: ['default'],

    // Timeouts conservadores
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
// ── FIN: vitest config raíz ──
