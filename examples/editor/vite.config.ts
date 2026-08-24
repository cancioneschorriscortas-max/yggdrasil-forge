import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    react(),
    // ── 15.6 — PWA / offline (MASTER §62) ──
    // O editor é 100% client-side: co shell precacheado funciona
    // enteiro sen rede (importar/exportar/autosave incluídos) e o
    // navegador ofrece instalalo. Iconas xeradas UNHA vez por
    // scripts/gen-pwa-icons.mjs desde logic-seedling (commiteadas).
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Yggdrasil Editor',
        short_name: 'Yggdrasil',
        description: 'Editor visual de árbores de progresión (skill trees) — Yggdrasil Forge.',
        lang: 'gl',
        start_url: '.',
        display: 'standalone',
        background_color: '#f4f4f1',
        theme_color: '#fbfbfa',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
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
