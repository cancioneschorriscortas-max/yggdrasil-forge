// ── INICIO: server entry point ──
// Entry point RSC-safe (React Server Components). Re-exporta os
// elementos seguros para usar dende server components ou SSR puro.
//
// **NON re-exporta** pezas que requiren 'use client' ou hooks:
//   SkillTree, ThemeProvider, SVGRenderer, SkillTreeAnnouncer,
//   hooks/*, minimal, Theme.

export { SkillTreeStatic } from './SkillTreeStatic.js'
export type { SkillTreeStaticProps } from './SkillTreeStatic.js'

export { computeLayout } from '@yggdrasil-forge/core'

export { serializeForClient } from './serializeForClient.js'
// ── FIN: server entry point ──
