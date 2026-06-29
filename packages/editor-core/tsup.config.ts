// ── INICIO: tsup config para @yggdrasil-forge/editor-core ──
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  external: ['@yggdrasil-forge/common', '@yggdrasil-forge/core'],
  tsconfig: 'tsconfig.json',
})
// ── FIN: tsup config ──
