// ── INICIO: OutlinerPanel ──
// Panel «Estrutura» do lado esquerdo. Lista grupos/nodos do documento.
//
// 7.18b «Ir ao nodo» (petición literal do dono): clic nun nodo →
// selecciónao E centra a vista nel (via onNavigateToNode do shell,
// que delega en SkillTreeHandle.centerOn). En vista tarxetas só
// selecciona (non hai viewport de grafo; o navegador é no-op).
// Os grupos quedan como filas informativas (§13: ninguén pediu
// seleccionar membros).

import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import { type JSX, useSyncExternalStore } from 'react'
import { useShellRuntime } from '../shell/ShellRuntimeContext.js'

export interface OutlinerPanelProps {
  readonly engine: EditorEngine
}

export function OutlinerPanel({ engine }: OutlinerPanelProps): JSX.Element {
  // useSyncExternalStore con subscribe do engine → re-render en commit.
  const doc = useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getDocument(),
  )
  const { onNavigateToNode } = useShellRuntime()
  const groups = doc.tree.groups ?? []
  const nodes = doc.tree.nodes

  const handleClickNode = (nodeId: string): void => {
    engine.getSession().selection.replace([{ kind: 'node', id: nodeId }])
    onNavigateToNode(nodeId)
  }

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
                <li key={n.id}>
                  <button
                    type="button"
                    className="editor-outliner__node"
                    title="Ir ao nodo"
                    onClick={() => handleClickNode(n.id)}
                  >
                    {n.id}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
// ── FIN: OutlinerPanel ──
