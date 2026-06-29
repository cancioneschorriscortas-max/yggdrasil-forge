// ── INICIO: StatusBar ──
// Barra de estado inferior. Counts de nodos/arestas, modo actual, e
// "Mundo W×H" se coordinateBounds está presente no meta. Pura
// lectura — non interactiva.

import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import { type JSX, useSyncExternalStore } from 'react'
import type { EditorMode } from './useEditorMode.js'

export interface StatusBarProps {
  readonly engine: EditorEngine
  readonly mode: EditorMode
}

export function StatusBar({ engine, mode }: StatusBarProps): JSX.Element {
  const doc = useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getDocument(),
  )
  const bounds = doc.meta.coordinateBounds
  const worldLabel =
    bounds === undefined ? null : `World ${bounds.maxX - bounds.minX}×${bounds.maxY - bounds.minY}`

  return (
    // biome-ignore lint/a11y/useSemanticElements: status bar = container con role=status (non hai elemento HTML semántico equivalente).
    <div className="editor-statusbar" role="status" aria-live="polite">
      <span className="editor-statusbar__item">
        <span aria-label="node count">nodes {doc.tree.nodes.length}</span>
      </span>
      <span className="editor-statusbar__divider" />
      <span className="editor-statusbar__item">
        <span aria-label="edge count">edges {doc.tree.edges.length}</span>
      </span>
      <span className="editor-statusbar__divider" />
      <span className="editor-statusbar__item">
        <span className="editor-statusbar__mode" aria-label="mode">
          {mode}
        </span>
      </span>
      {worldLabel !== null && (
        <>
          <span className="editor-statusbar__divider" />
          <span className="editor-statusbar__item">{worldLabel}</span>
        </>
      )}
    </div>
  )
}
// ── FIN: StatusBar ──
