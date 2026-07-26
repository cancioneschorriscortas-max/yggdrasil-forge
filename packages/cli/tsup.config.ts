// ── INICIO: tsup config para @yggdrasil-forge/cli ──
import { defineConfig } from 'tsup'

export default defineConfig({
  // bin.ts é o executable `ygg` (o shebang consérvao esbuild).
  entry: ['src/index.ts', 'src/bin.ts'],
  format: ['esm', 'cjs'],
  // Mesmo patrón que editor-core: o dts de tsup non traga composite.
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
  external: [
    '@yggdrasil-forge/common',
    '@yggdrasil-forge/core',
    '@yggdrasil-forge/editor-core',
    'zod',
    'zod-to-json-schema',
  ],
  tsconfig: 'tsconfig.json',
})
// ── FIN: tsup config ──
