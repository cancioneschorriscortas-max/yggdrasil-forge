// ── INICIO: CostEditor ──
// Sub-editor para `node.cost: Cost[]` onde Cost = {resourceId, amount}.
//
// **resourceId enum desde `doc.tree.resources`** (briefing §7.1: non
// hardcodear). Se a árbore non ten resources, mostra hint.
//
// **Granularidade**: cada add/remove/edit = 1 setNodeField = 1 entrada
// de history. Para edicións de amount, commit on blur (igual que
// NumberWidget en 7.5c-i).

import type { Cost, Resource } from '@yggdrasil-forge/core'
import { type JSX, useEffect, useState } from 'react'
import { Select, type SelectOption } from '../widgets/Select.js'

export interface CostEditorProps {
  readonly value: readonly Cost[] | undefined
  readonly resources: readonly Resource[] | undefined
  readonly onCommit: (next: readonly Cost[]) => void
}

export function CostEditor({ value, resources, onCommit }: CostEditorProps): JSX.Element {
  const list = value ?? []
  const availableResources = resources ?? []

  if (availableResources.length === 0) {
    return (
      <div className="editor-inspector-struct">
        <p className="editor-inspector__hint">A árbore non ten resources definidos.</p>
      </div>
    )
  }

  const removeAt = (idx: number): void => {
    const next = list.filter((_, i) => i !== idx)
    onCommit(next)
  }
  const editAmount = (idx: number, amount: number): void => {
    const next = list.map((c, i) => (i === idx ? { ...c, amount } : c))
    onCommit(next)
  }
  const editResourceId = (idx: number, resourceId: string): void => {
    const next = list.map((c, i) => (i === idx ? { ...c, resourceId } : c))
    onCommit(next)
  }
  const addCost = (resourceId: string): void => {
    if (resourceId === '') return
    onCommit([...list, { resourceId, amount: 1 }])
  }

  // Resources non usados (para ofrecer no selector de engadir).
  const usedIds = new Set(list.map((c) => c.resourceId))
  const addable = availableResources.filter((r) => !usedIds.has(r.id))

  return (
    <div className="editor-inspector-struct">
      {list.length === 0 ? (
        <p className="editor-inspector__hint">Sen costos.</p>
      ) : (
        <ul className="editor-inspector-struct__list">
          {list.map((cost, idx) => (
            <CostRow
              key={`${cost.resourceId}-${idx}`}
              cost={cost}
              resources={availableResources}
              onEditResource={(r) => editResourceId(idx, r)}
              onEditAmount={(a) => editAmount(idx, a)}
              onRemove={() => removeAt(idx)}
            />
          ))}
        </ul>
      )}
      {addable.length > 0 && (
        <div className="editor-inspector-struct__add">
          <Select
            value=""
            options={[
              { value: '', label: '— engadir custo —' },
              ...addable.map((r): SelectOption => ({ value: r.id, label: r.id })),
            ]}
            onChange={addCost}
            ariaLabel="Engadir custo"
          />
        </div>
      )}
    </div>
  )
}

interface CostRowProps {
  readonly cost: Cost
  readonly resources: readonly Resource[]
  readonly onEditResource: (next: string) => void
  readonly onEditAmount: (next: number) => void
  readonly onRemove: () => void
}

function CostRow({
  cost,
  resources,
  onEditResource,
  onEditAmount,
  onRemove,
}: CostRowProps): JSX.Element {
  const initialAmount = String(cost.amount)
  const [localAmount, setLocalAmount] = useState(initialAmount)
  useEffect(() => {
    setLocalAmount(initialAmount)
  }, [initialAmount])

  const commitAmount = (): void => {
    if (localAmount === initialAmount) return
    const parsed = Number(localAmount)
    if (!Number.isFinite(parsed)) {
      setLocalAmount(initialAmount)
      return
    }
    onEditAmount(parsed)
  }

  return (
    <li className="editor-inspector-struct__row">
      <Select
        value={cost.resourceId}
        options={resources.map((r): SelectOption => ({ value: r.id, label: r.id }))}
        onChange={onEditResource}
        ariaLabel="Resource id"
      />
      <input
        type="number"
        className="editor-inspector-input editor-inspector-struct__num"
        value={localAmount}
        onChange={(e) => setLocalAmount(e.target.value)}
        onBlur={commitAmount}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            setLocalAmount(initialAmount)
            e.currentTarget.blur()
          }
        }}
        aria-label="Amount"
      />
      <button
        type="button"
        className="editor-inspector-struct__remove"
        onClick={onRemove}
        aria-label={`Quitar custo ${cost.resourceId}`}
      >
        ×
      </button>
    </li>
  )
}
// ── FIN: CostEditor ──
