// ── INICIO: vitest config para @yggdrasil-forge/importers ──
import { defineConfig, mergeConfig } from 'vitest/config'
import rootConfig from '../../vitest.config'

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      include: ['__tests__/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    },
  }),
)
// ── FIN: vitest config ──
