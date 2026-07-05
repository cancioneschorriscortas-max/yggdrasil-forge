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
import { PROBA_STRINGS, pickLoc } from '../proba/probaStrings.js'
import type { EditorMode } from './useEditorMode.js'

export interface TopBarProps {
  readonly engine: EditorEngine
  readonly mode: EditorMode
  readonly onToggleMode: () => void
}

export function TopBar({ engine, mode, onToggleMode }: TopBarProps): JSX.Element {
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

      <div className="editor-topbar__section" aria-label="layouts">
        <button type="button" className="editor-button" disabled title="Design layout (TODO)">
          Design
        </button>
        <button type="button" className="editor-button" disabled title="Tree layout (TODO)">
          Tree
        </button>
        <button type="button" className="editor-button" disabled title="Testing layout (TODO)">
          Testing
        </button>
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
