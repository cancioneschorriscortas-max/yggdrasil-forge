// ── INICIO: headless entry point ──
// Entry point alternativo para power users que queiran cero estilos
// por defecto. Re-exporta os compoñentes core sen aplicar autoload
// de tema.
//
// Diferenza fronte ao root entry:
// - `SkillTree`: exporta o core directamente (cero ThemeProvider
//   wrapper, cero autoload de minimal).
// - **SI** se re-exportan `ThemeProvider`, `ThemeProviderProps` e o
//   tipo `Theme` (DX: un consumidor headless pode tematizar sen
//   importar de /index e sen colisión de bundles — ver
//   F10.3.fix-2 cross-bundle singleton).
// - **NON** se re-exporta `minimal` (segue sendo autoload-only de
//   /index para preservar o "cero estilos" por defecto en headless).

export { SkillTree } from './SkillTree.js'
export type { SkillTreeProps } from './SkillTree.js'

export { SkillNode } from './SkillNode.js'
export type { SkillNodeProps } from './SkillNode.js'

export { SkillEdge } from './SkillEdge.js'
export type { SkillEdgeProps } from './SkillEdge.js'

export { MeshOverlay } from './MeshOverlay.js'
export type { MeshOverlayProps } from './MeshOverlay.js'

export { SVGRenderer } from './SVGRenderer.js'
export type { SVGRendererProps } from './SVGRenderer.js'

// Tematización: re-exportada en headless para DX (sub-fase
// F10.3.fix-2). O singleton de `ThemeContext` (Symbol.for global)
// garante que sexa este import ou o de /index, ambos comparten a
// mesma instancia de Context.
export { ThemeProvider } from './ThemeProvider.js'
export type { ThemeProviderProps } from './ThemeProvider.js'
export type { Theme, ThemeColors, ThemeSizes } from './theme-types.js'

// Hooks customizados (mesmo set que root entry; independentes do tema).
export {
  useSkillTree,
  useNodeState,
  useNodeSelector,
  useStat,
} from './hooks/index.js'

// Compoñente de accesibilidade (mesmo set que root entry).
export { SkillTreeAnnouncer } from './SkillTreeAnnouncer.js'
export type { SkillTreeAnnouncerProps } from './SkillTreeAnnouncer.js'

// Error boundary (class component; require 'use client').
export { SkillTreeErrorBoundary } from './SkillTreeErrorBoundary.js'
export type { SkillTreeErrorBoundaryProps } from './SkillTreeErrorBoundary.js'

// F10.5: rexistro de iconos SVG. Mesma API en /index e /headless; o
// singleton Symbol.for(globalThis) garante que ambos vexan o mesmo
// Map (A.6.21 — caso xemelo de A.6.17 para ThemeContext). O auto-
// rexistro dos builtins vive en `registry.ts` (top-level), non
// require side-effect import (sería tree-shaken por
// `"sideEffects": false`).
export { registerIcon, registerIcons, getIcon, hasIcon } from './icons/registry.js'
export type { IconDef, IconPath } from './icons/registry.js'
export { IconGlyph } from './icons/IconGlyph.js'
export type { IconGlyphProps } from './icons/IconGlyph.js'
export { BUILTIN_ICONS } from './icons/registry.js'
// ── FIN: headless entry point ──
