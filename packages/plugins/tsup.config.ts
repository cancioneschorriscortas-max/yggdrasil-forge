// ── INICIO: tsup config para @yggdrasil-forge/plugins ──
// DT-14 fix aplicado dende inicio: composite:false necesario porque
// @plugins depende transitivamente de @common (que ten composite:true).
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
  tsconfig: 'tsconfig.json',
})
// ── FIN: tsup config ──
