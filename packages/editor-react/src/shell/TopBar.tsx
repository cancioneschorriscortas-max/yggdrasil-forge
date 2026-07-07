// ── INICIO: TopBar ──
// Barra superior do shell. Mantén:
//   - Brand (logo/nome + version tag).
//   - Presets LAYOUTS (placeholder; reconfigurarán dockview en futuro).
//   - undo/redo (só en Autoría, ocúltanse en Proba).
//   - Zoom (placeholder).
//   - Toggle de modo (Autoría ↔ Proba, localizado en 7.6).
//
// Re-renderiza nos cambios commiteados do engine via useSyncExternalStore
// (para refrescar canUndo/canRedo).

import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import { type JSX, useCallback, useSyncExternalStore } from 'react'
import type { PanelDef } from '../panels/PanelHost.js'
import { PROBA_STRINGS, pickLoc } from '../proba/probaStrings.js'
import { PanelsMenu } from './PanelsMenu.js'
import type { EditorMode } from './useEditorMode.js'

export interface TopBarProps {
  readonly engine: EditorEngine
  readonly mode: EditorMode
  readonly onToggleMode: () => void
  /** Paneis dispoñibles no modo actual (para o menú Paneis). */
  readonly panels: readonly PanelDef[]
  /** Ids dos paneis actualmente visibles. */
  readonly visiblePanelIds: readonly string[]
  /** Alterna visibilidade dun panel (mostra se pechado, pecha se visible). */
  readonly onTogglePanel: (id: string) => void
  /** Restaura a disposición por defecto (limpando gardado). */
  readonly onResetLayout: () => void
  /**
   * Tema do chrome (7.8). Controlado desde a app — se non se pasa, o
   * switch claro/escuro non se renderiza.
   */
  readonly theme?: 'light' | 'dark'
  /** Chamado co tema oposto ao actual cando o usuario clica o switch. */
  readonly onThemeChange?: (theme: 'light' | 'dark') => void
}

export function TopBar({
  engine,
  mode,
  onToggleMode,
  panels,
  visiblePanelIds,
  onTogglePanel,
  onResetLayout,
  theme,
  onThemeChange,
}: TopBarProps): JSX.Element {
  // Re-render en cada commit (canUndo/canRedo cambian).
  useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getDocument(),
  )
  const canUndo = engine.canUndo()
  const canRedo = engine.canRedo()
  const inProba = mode === 'preview'

  const handleUndo = useCallback(() => {
    engine.undo()
  }, [engine])
  const handleRedo = useCallback(() => {
    engine.redo()
  }, [engine])

  return (
    <div className="editor-topbar" role="toolbar" aria-label="editor toolbar">
      <div className="editor-topbar__brand">
        <span className="editor-topbar__brand-name">Yggdrasil</span>
        <span className="editor-topbar__brand-tag">editor</span>
      </div>

      <div className="editor-topbar__divider" />

      {/* Menú Paneis (7.7 §1): dropdown con visibilidade + Restaurar. */}
      <div className="editor-topbar__section" aria-label="paneis">
        <PanelsMenu
          panels={panels}
          visiblePanelIds={visiblePanelIds}
          onTogglePanel={onTogglePanel}
          onResetLayout={onResetLayout}
        />
      </div>

      {/* Undo/redo só ten sentido en Autoría — en Proba, o "undo"
          é «Reiniciar proba» (vive no ProbaPanel). */}
      {!inProba && (
        <>
          <div className="editor-topbar__divider" />
          <div className="editor-topbar__section" aria-label="history">
            <button
              type="button"
              className="editor-button"
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label="undo"
              title="Undo"
            >
              ↶
            </button>
            <button
              type="button"
              className="editor-button"
              onClick={handleRedo}
              disabled={!canRedo}
              aria-label="redo"
              title="Redo"
            >
              ↷
            </button>
          </div>
        </>
      )}

      <div className="editor-topbar__divider" />

      <div className="editor-topbar__section" aria-label="zoom">
        <button type="button" className="editor-button" disabled title="Zoom out (TODO)">
          −
        </button>
        <button type="button" className="editor-button" disabled title="Zoom in (TODO)">
          +
        </button>
      </div>

      <div className="editor-topbar__spacer" />

      {theme !== undefined && (
        <>
          <div className="editor-topbar__section" aria-label="tema">
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Tema escuro"
              title="Tema escuro"
              className="editor-theme-switch"
              onClick={() => onThemeChange?.(theme === 'dark' ? 'light' : 'dark')}
            >
              <span className="editor-theme-switch__icon" aria-hidden="true">
                {theme === 'dark' ? '🌙' : '☀'}
              </span>
              <span className="editor-theme-switch__track" aria-hidden="true">
                <span className="editor-theme-switch__thumb" />
              </span>
            </button>
          </div>
          <div className="editor-topbar__divider" />
        </>
      )}

      <div className="editor-topbar__section" aria-label="mode">
        <button
          type="button"
          className={`editor-button editor-button--mode${
            mode === 'authoring' ? ' editor-button--active' : ''
          }`}
          onClick={() => mode !== 'authoring' && onToggleMode()}
          aria-pressed={mode === 'authoring'}
        >
          {pickLoc(PROBA_STRINGS.modeAuthoring)}
        </button>
        <button
          type="button"
          className={`editor-button editor-button--mode${
            mode === 'preview' ? ' editor-button--active' : ''
          }`}
          onClick={() => mode !== 'preview' && onToggleMode()}
          aria-pressed={mode === 'preview'}
        >
          {pickLoc(PROBA_STRINGS.modePreview)}
        </button>
      </div>
    </div>
  )
}
// ── FIN: TopBar ──
