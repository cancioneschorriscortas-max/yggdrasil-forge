// ── INICIO: docs-site/astro.config.mjs (16.1) ──
// Documentación pública de Yggdrasil Forge. Starlight con i18n:
// galego = locale raíz (URLs sen prefixo), inglés en /en/. O galego é
// o orixinal canónico; o inglés é tradución completa (garda en
// scripts/check-i18n.mjs: unha páxina sen tradución tira o build).
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import { createStarlightTypeDocPlugin } from 'starlight-typedoc'

// 17.4: referencia de API XERADA do TSDoc (colleitar, non transcribir;
// mesmo patrón anti-drift ca render-gallery: prodúcese no build, non se
// commitea, e se typedoc falla o build do site falla). Unha instancia
// por paquete público para que cada un teña o seu grupo na sidebar.
// Decisión de lingua (pinada no briefing): a referencia vai NUNHA soa
// lingua, a do TSDoc fonte; a nota en referencia-api.md explícao.
const [commonTypeDoc, commonSidebar] = createStarlightTypeDocPlugin()
const [coreTypeDoc, coreSidebar] = createStarlightTypeDocPlugin()
const [reactTypeDoc, reactSidebar] = createStarlightTypeDocPlugin()
const [editorCoreTypeDoc, editorCoreSidebar] = createStarlightTypeDocPlugin()
const [cliTypeDoc, cliSidebar] = createStarlightTypeDocPlugin()

/** Config común dunha instancia typedoc (entry + tsconfig por paquete). */
function typeDocInstance(plugin, pkg, options = {}) {
  return plugin({
    entryPoints: [`../packages/${pkg}/src/index.ts`],
    tsconfig: `../packages/${pkg}/tsconfig.json`,
    output: `api/${pkg}`,
    sidebar: { collapsed: true, label: `@yggdrasil-forge/${pkg}` },
    typeDoc: {
      // Sen README dos paquetes dentro da referencia (xa teñen páxina en npm).
      readme: 'none',
      excludePrivate: true,
      excludeInternal: true,
      ...options,
    },
  })
}

// GitHub Pages: <usuario>.github.io/<repo>/ — sobrescribible con
// DOCS_BASE / DOCS_SITE para previsualizar noutro lugar.
const base = process.env.DOCS_BASE ?? '/yggdrasil-forge'
const site = process.env.DOCS_SITE ?? 'https://cancioneschorriscortas-max.github.io'

export default defineConfig({
  site,
  base,
  integrations: [
    starlight({
      title: 'Yggdrasil Forge',
      description:
        'Motor de árbores de progresión (skill trees) para apps educativas e xogos. Datos primeiro, render despois.',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Galego', lang: 'gl' },
        en: { label: 'English', lang: 'en' },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/cancioneschorriscortas-max/yggdrasil-forge',
        },
      ],
      editLink: {
        baseUrl:
          'https://github.com/cancioneschorriscortas-max/yggdrasil-forge/edit/main/docs-site/',
      },
      plugins: [
        typeDocInstance(commonTypeDoc, 'common'),
        typeDocInstance(coreTypeDoc, 'core'),
        typeDocInstance(reactTypeDoc, 'react'),
        typeDocInstance(editorCoreTypeDoc, 'editor-core'),
        typeDocInstance(cliTypeDoc, 'cli'),
      ],
      sidebar: [
        // 18.0: o editor vivo, sempre á vista. Starlight non ten navbar
        // de ligazóns sen override de compoñente (criterio do Executor:
        // primeira entrada fixa da sidebar + botón primario do hero).
        {
          label: '🌳 Editor en vivo',
          translations: { en: '🌳 Live editor' },
          link: 'https://cancioneschorriscortas-max.github.io/yggdrasil-forge/editor/',
        },
        {
          label: 'Comeza aquí',
          translations: { en: 'Start here' },
          autogenerate: { directory: 'comeza' },
        },
        {
          label: 'O contrato TreeDef',
          translations: { en: 'The TreeDef contract' },
          autogenerate: { directory: 'contrato' },
        },
        {
          label: 'Guía do editor',
          translations: { en: 'Editor guide' },
          autogenerate: { directory: 'editor' },
        },
        {
          label: 'Theming',
          translations: { en: 'Theming' },
          autogenerate: { directory: 'theming' },
        },
        {
          label: 'Layouts',
          translations: { en: 'Layouts' },
          autogenerate: { directory: 'layouts' },
        },
        {
          label: 'A vía do dato',
          translations: { en: 'The data path' },
          autogenerate: { directory: 'via-do-dato' },
        },
        {
          label: 'Exemplos',
          translations: { en: 'Examples' },
          autogenerate: { directory: 'exemplos' },
        },
        {
          label: 'Guía de extensión',
          translations: { en: 'Extension guide' },
          autogenerate: { directory: 'extension' },
        },
        {
          label: 'Arquitectura',
          translations: { en: 'Architecture' },
          autogenerate: { directory: 'arquitectura' },
        },
        {
          label: 'API',
          translations: { en: 'API' },
          items: [
            {
              label: 'Sobre a referencia',
              translations: { en: 'About the reference' },
              slug: 'referencia-api',
            },
            commonSidebar,
            coreSidebar,
            reactSidebar,
            editorCoreSidebar,
            cliSidebar,
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
})
// ── FIN: docs-site/astro.config.mjs ──
