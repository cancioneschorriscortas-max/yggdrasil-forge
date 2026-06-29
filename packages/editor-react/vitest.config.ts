import react from '@vitejs/plugin-react'
// ── INICIO: vitest config para @yggdrasil-forge/editor-react ──
import { defineConfig, mergeConfig } from 'vitest/config'
import rootConfig from '../../vitest.config'

export default mergeConfig(
  rootConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./__tests__/setup.ts'],
      include: ['__tests__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
      server: {
        deps: {
          inline: [/^@yggdrasil-forge\//, 'dockview-react'],
        },
      },
    },
  }),
)
// ── FIN: vitest config ──
