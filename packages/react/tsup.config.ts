// ── INICIO: tsup config para @yggdrasil-forge/react ──
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
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
  external: ['@yggdrasil-forge/core', 'react', 'react-dom', 'react/jsx-runtime'],
  tsconfig: 'tsconfig.json',
})
// ── FIN: tsup config ──
