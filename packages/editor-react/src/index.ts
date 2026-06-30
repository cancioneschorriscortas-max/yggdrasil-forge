// ── INICIO: @yggdrasil-forge/editor-react public API ──
// React UI shell para o editor de Yggdrasil. 7.5a entrega o CHROME
// (PanelHost + tres zonas + barra superior + status bar + theme
// tokens). O canvas real, overlay e inspector reais virán en 7.5b/c.

export const VERSION = '0.0.0'

// Shell principal — punto de entrada para o consumidor.
export { EditorShell, type EditorShellProps } from './EditorShell.js'

// Sub-compoñentes (utilidades / composición avanzada).
export { TopBar, type TopBarProps } from './shell/TopBar.js'
export { StatusBar, type StatusBarProps } from './shell/StatusBar.js'
export { useEditorMode, type EditorMode, type UseEditorModeResult } from './shell/useEditorMode.js'

// PanelHost — wrapper de dockview (substitúese aquí se cambiamos).
export {
  PanelHost,
  type PanelDef,
  type PanelHostProps,
  type PanelProps,
} from './panels/PanelHost.js'

// Paneis (placeholder en 7.5a — vanse substituíndo).
export { OutlinerPanel, type OutlinerPanelProps } from './panels/OutlinerPanel.js'
export { InspectorPanel, ProblemsPanel } from './panels/PlaceholderPanels.js'

// Canvas (7.5b-i): render do documento + pan/zoom + selección por clic.
export { EditorCanvas, type EditorCanvasProps } from './canvas/EditorCanvas.js'
// ── FIN: barrel ──
