// ── INICIO: OutlinerPanel ──
// Panel placeholder do lado esquerdo. Proba a conexión engine↔UI sin
// canvas: lista os grupos/nodos do documento. O Outliner "real" virá
// na fase de UI completa; isto é só un sinal de vida.

import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import { type JSX, useSyncExternalStore } from 'react'

export interface OutlinerPanelProps {
  readonly engine: EditorEngine
}

export function OutlinerPanel({ engine }: OutlinerPanelProps): JSX.Element {
  // useSyncExternalStore con subscribe do engine → re-render en commit.
  const doc = useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getDocument(),
  )
  const groups = doc.tree.groups ?? []
  const nodes = doc.tree.nodes

  return (
    <div className="editor-panel">
      <div className="editor-panel__body">
        {groups.length === 0 && nodes.length === 0 ? (
          <div className="editor-panel__placeholder">empty document</div>
        ) : (
          <>
            {groups.length > 0 && (
              <>
                <div
                  style={{
                    color: 'var(--editor-text-secondary)',
                    fontSize: 'var(--editor-font-size-xs)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  groups
                </div>
                <ul className="editor-panel__list">
                  {groups.map((g) => (
                    <li key={g.id}>{g.id}</li>
                  ))}
                </ul>
                <div style={{ height: 12 }} />
              </>
            )}
            <div
              style={{
                color: 'var(--editor-text-secondary)',
                fontSize: 'var(--editor-font-size-xs)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              nodes ({nodes.length})
            </div>
            <ul className="editor-panel__list">
              {nodes.map((n) => (
                <li key={n.id}>{n.id}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
// ── FIN: OutlinerPanel ──
