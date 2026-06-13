// ── INICIO: headless entry point ──
// Entry point alternativo para power users que queiran cero estilos
// por defecto. Re-exporta os compoñentes core sen aplicar autoload
// de tema.
//
// Diferenza fronte ao root entry:
// - `SkillTree`: exporta o core directamente (cero ThemeProvider
//   wrapper, cero autoload de minimal).
// - **NON** se re-exportan: `ThemeProvider`, `Theme`, `minimal`.
//   O consumidor headless decide o tema explícitamente (importando
//   desde root) ou non aplica ningún (modo verdadeiramente headless).

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
// ── FIN: headless entry point ──
