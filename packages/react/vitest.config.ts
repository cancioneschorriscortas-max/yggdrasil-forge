// ── INICIO: vitest config para @yggdrasil-forge/react ──
import { defineConfig, mergeConfig } from 'vitest/config'
import rootConfig from '../../vitest.config'

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      include: ['__tests__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    },
  }),
)
// ── FIN: vitest config ──
