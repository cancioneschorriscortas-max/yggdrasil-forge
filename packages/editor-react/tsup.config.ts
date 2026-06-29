// ── INICIO: tsup config para @yggdrasil-forge/editor-react ──
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/styles.css'],
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
  external: [
    '@yggdrasil-forge/common',
    '@yggdrasil-forge/core',
    '@yggdrasil-forge/react',
    '@yggdrasil-forge/editor-core',
    'dockview-react',
    'react',
    'react-dom',
    'react/jsx-runtime',
  ],
  // Inclúe os tokens CSS na build (sideEffects=true para .css preservou).
  loader: { '.css': 'copy' },
  tsconfig: 'tsconfig.json',
})
// ── FIN: tsup config ──
