// ── INICIO: paneis placeholder (Inspector / Problems) ──
// 7.5b-i: o CanvasPanel xa non é placeholder — substituíuse polo
// EditorCanvas real (canvas/EditorCanvas.tsx) que se rexistra
// directamente no PanelHost desde EditorShell.
//
// Inspector segue placeholder, pero **proba a conexión engine↔UI**
// mostrando o id do nodo seleccionado (vía SelectionEngine subscribe).
// É unha sondaxe — o Inspector real (Property Registry) vén en 7.5c.
//
// Problems segue placeholder até que se renderice o panel real con
// engine.getIssues().

import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import { type JSX, useSyncExternalStore } from 'react'

export interface InspectorPanelProps {
  readonly engine: EditorEngine
}

export function InspectorPanel({ engine }: InspectorPanelProps): JSX.Element {
  const selection = engine.getSession().selection
  // Subscribir á selección: cada cambio de selección actualiza o panel.
  const selectedId = useSyncExternalStore(
    (cb) => selection.subscribe(cb),
    () => {
      const refs = selection.current()
      for (const ref of refs) {
        if (ref.kind === 'node') return ref.id
      }
      return null
    },
    () => null,
  )

  return (
    <div className="editor-panel">
      <div className="editor-panel__body">
        {selectedId === null ? (
          <div className="editor-panel__placeholder">
            no selection
            <br />
            <span style={{ fontSize: 'var(--editor-font-size-xs)' }}>
              (Property Registry en 7.5c)
            </span>
          </div>
        ) : (
          <div>
            <div
              style={{
                color: 'var(--editor-text-secondary)',
                fontSize: 'var(--editor-font-size-xs)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              selected node
            </div>
            <div
              style={{
                fontFamily: 'var(--editor-font-mono)',
                fontSize: 'var(--editor-font-size-md)',
                padding: '6px 8px',
                background: 'var(--editor-bg-selected)',
                borderRadius: 'var(--editor-radius-sm)',
                color: 'var(--editor-accent)',
              }}
            >
              {selectedId}
            </div>
            <div
              style={{
                marginTop: 16,
                color: 'var(--editor-text-muted)',
                fontSize: 'var(--editor-font-size-xs)',
                fontStyle: 'italic',
              }}
            >
              (Property Registry en 7.5c)
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ProblemsPanel(): JSX.Element {
  return (
    <div className="editor-panel">
      <div className="editor-panel__body">
        <div className="editor-panel__placeholder">
          problems placeholder
          <br />
          (renderará ValidationIssue de engine.getIssues())
        </div>
      </div>
    </div>
  )
}
// ── FIN: paneis placeholder ──
