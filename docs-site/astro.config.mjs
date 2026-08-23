// ── INICIO: docs-site/astro.config.mjs (16.1) ──
// Documentación pública de Yggdrasil Forge. Starlight con i18n:
// galego = locale raíz (URLs sen prefixo), inglés en /en/. O galego é
// o orixinal canónico; o inglés é tradución completa (garda en
// scripts/check-i18n.mjs: unha páxina sen tradución tira o build).
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

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
      sidebar: [
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
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
})
// ── FIN: docs-site/astro.config.mjs ──
