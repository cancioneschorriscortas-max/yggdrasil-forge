// ── INICIO: ExclusionsEditor ──
// Sub-editor para `node.exclusions: string[]` (ids doutros nodos
// mutuamente excluíntes con este).
//
// **Pattern**: cada cambio recalcula o array enteiro e dispara
// `setNodeField(nodeId, 'exclusions', novoArray)` → 1 entrada de
// history por add/remove (granularidade correcta).
//
// **Caza esperada**: engadir A→B onde B non ten A → o soft validator
// `asymmetricExclusionValidator` (7.4) emite un warning que aparece no
// panel Problemas. ★ Loop conciencia→voz.

import type { NodeDef } from '@yggdrasil-forge/core'
import type { JSX } from 'react'
import { Select, type SelectOption } from '../widgets/Select.js'

export interface ExclusionsEditorProps {
  readonly value: readonly string[] | undefined
  readonly currentNodeId: string
  readonly allNodes: readonly NodeDef[]
  readonly onCommit: (next: readonly string[]) => void
}

export function ExclusionsEditor({
  value,
  currentNodeId,
  allNodes,
  onCommit,
}: ExclusionsEditorProps): JSX.Element {
  const list = value ?? []
  // Candidatos a engadir: todos os outros nodos que NON están xa na lista.
  const available = allNodes
    .filter((n) => n.id !== currentNodeId)
    .filter((n) => !list.includes(n.id))

  const removeAt = (idx: number): void => {
    const next = list.filter((_, i) => i !== idx)
    onCommit(next)
  }
  const addId = (id: string): void => {
    if (id === '' || list.includes(id)) return
    onCommit([...list, id])
  }

  return (
    <div className="editor-inspector-struct">
      {list.length === 0 ? (
        <p className="editor-inspector__hint">Sen exclusións.</p>
      ) : (
        <ul className="editor-inspector-struct__list">
          {list.map((id) => (
            <li key={id} className="editor-inspector-struct__row">
              <span className="editor-inspector-struct__item-id">{id}</span>
              <button
                type="button"
                className="editor-inspector-struct__remove"
                onClick={() => removeAt(list.indexOf(id))}
                aria-label={`Quitar exclusión ${id}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 && (
        <div className="editor-inspector-struct__add">
          <Select
            value=""
            options={[
              { value: '', label: '— engadir exclusión —' },
              ...available.map((n): SelectOption => ({ value: n.id, label: n.id })),
            ]}
            onChange={addId}
            ariaLabel="Engadir exclusión"
          />
        </div>
      )}
    </div>
  )
}
// ── FIN: ExclusionsEditor ──
