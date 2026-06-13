// ── INICIO: @yggdrasil-forge/react ──
// Entry point principal. Inclúe SkillTree con autoload do tema
// 'minimal' por defecto. Para cero estilos, importar desde
// `@yggdrasil-forge/react/headless`.

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.0.0'

// SkillTree exportado como wrapper con autoload de tema minimal.
// O core SkillTree (sen wrapper) está dispoñible vía /headless.
export { SkillTreeWithDefaultTheme as SkillTree } from './SkillTreeWithDefaultTheme.js'
export type { SkillTreeProps } from './SkillTree.js'

// Compoñentes individuais (cero diferenza fronte a /headless).
export { SkillNode } from './SkillNode.js'
export type { SkillNodeProps } from './SkillNode.js'

export { SkillEdge } from './SkillEdge.js'
export type { SkillEdgeProps } from './SkillEdge.js'

export { MeshOverlay } from './MeshOverlay.js'
export type { MeshOverlayProps } from './MeshOverlay.js'

export { SVGRenderer } from './SVGRenderer.js'
export type { SVGRendererProps } from './SVGRenderer.js'

// Tema infra (só dispoñible desde root entry).
export { ThemeProvider } from './ThemeProvider.js'
export type { ThemeProviderProps } from './ThemeProvider.js'
export type { Theme, ThemeColors, ThemeSizes } from './theme-types.js'
export { minimal } from './themes/minimal.js'

// Hooks customizados (independentes do tema).
export {
  useSkillTree,
  useNodeState,
  useNodeSelector,
  useStat,
} from './hooks/index.js'

// Compoñente de accesibilidade (announcements vía live region ARIA).
export { SkillTreeAnnouncer } from './SkillTreeAnnouncer.js'
export type { SkillTreeAnnouncerProps } from './SkillTreeAnnouncer.js'
// ── FIN: @yggdrasil-forge/react ──
