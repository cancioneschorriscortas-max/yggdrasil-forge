// ── INICIO: tsup config para @yggdrasil-forge/core ──
import { defineConfig } from 'tsup'

export default defineConfig([
  {
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
    external: ['@yggdrasil-forge/common', 'immer'],
    tsconfig: 'tsconfig.json',
  },
  {
    // 17.7: bundle EMBEBIBLE — IIFE autocontido (immer+zod+common
    // dentro, cero imports, cero DOM) para intérpretes JS incrustados
    // en motores: Jint (.NET/Unity), puerts (Unreal/Unity), GodotJS,
    // QuickJS. Global: `YggdrasilCore`. A porta de CI é o test de
    // fume en QuickJS (global-bundle.quickjs.test.ts): se isto deixa
    // de correr en JS-sen-DOM, o build falla, non a promesa.
    entry: { 'yggdrasil-core': 'src/index.ts' },
    format: ['iife'],
    globalName: 'YggdrasilCore',
    dts: false,
    sourcemap: false,
    clean: false,
    treeshake: true,
    splitting: false,
    minify: false,
    target: 'es2022',
    platform: 'neutral',
    noExternal: [/.*/],
    // Os intérpretes embebidos non teñen `process`; immer consúltao
    // para os seus avisos de dev. O embebible é produción por
    // definición.
    define: { 'process.env.NODE_ENV': '"production"' },
    tsconfig: 'tsconfig.json',
  },
])
// ── FIN: tsup config ──
