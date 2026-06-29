import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Resolución dos paquetes do workspace desde `src/` (non `dist/`).
// **Por que**: en dev, queremos editar @yggdrasil-forge/editor-react ou
// @yggdrasil-forge/editor-core e ver os cambios sen ter que correr o
// build antes. O package.json apunta a ./dist/index.cjs (consumidor
// publicado), pero en dev local Vite usa estes alias.
//
// Para producción (vite build), o mesmo alias funciona: TypeScript
// procesa todo desde fontes a través do plugin de React. Iso evita
// que o `pnpm turbo run build` teña que correr antes do `vite build`
// do exemplo.
const root = resolve(__dirname, '../..')

export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
  resolve: {
    alias: {
      '@yggdrasil-forge/editor-react/styles.css': resolve(
        root,
        'packages/editor-react/src/styles.css',
      ),
      '@yggdrasil-forge/editor-react': resolve(root, 'packages/editor-react/src/index.ts'),
      '@yggdrasil-forge/editor-core': resolve(root, 'packages/editor-core/src/index.ts'),
      '@yggdrasil-forge/core': resolve(root, 'packages/core/src/index.ts'),
      '@yggdrasil-forge/common': resolve(root, 'packages/common/src/index.ts'),
      '@yggdrasil-forge/react': resolve(root, 'packages/react/src/index.ts'),
    },
  },
})
