// ── INICIO: CostPerTierEditor (7.5f) ──
// Sub-editor para `NodeDef.costPerTier: readonly (readonly Cost[])[]`.
//
// **Deseño (adendo do Arquitecto)**: array DENSO. Cada fila = lista
// de custos para o rango. Fila sen custos = `[]` = gratis. "Volver
// á base" **só a nivel de campo** — botón «Quitar» dispatchase
// `undefined` (borra costPerTier). Non hai toggle por rango.
//
// **Cero cambios en @core**: o schema Zod é denso-only e JSON non
// representa sparse. Autoramos o subconxunto persistible.

import type { Cost, Resource } from '@yggdrasil-forge/core'
import {
  COST_PER_TIER_STRINGS,
  type CostPerTierRow,
  costPerTierRowsFor,
  packCostPerTier,
  rankLabel,
} from '@yggdrasil-forge/editor-core'
import { type JSX, useEffect, useState } from 'react'
import { Select, type SelectOption } from '../widgets/Select.js'

export interface CostPerTierEditorProps {
  readonly value: readonly (readonly Cost[])[] | undefined
  readonly maxTier: number | undefined
  readonly resources: readonly Resource[] | undefined
  readonly onCommit: (next: readonly (readonly Cost[])[] | undefined) => void
}

function pickText(loc: (typeof COST_PER_TIER_STRINGS)[keyof typeof COST_PER_TIER_STRINGS]): string {
  if (typeof loc === 'string') return loc
  return (loc as { gl?: string; en?: string }).gl ?? (loc as { en?: string }).en ?? ''
}

export function CostPerTierEditor({
  value,
  maxTier,
  resources,
  onCommit,
}: CostPerTierEditorProps): JSX.Element {
  const availableResources = resources ?? []
  const rows = costPerTierRowsFor(maxTier, value)
  const hasValue = value !== undefined

  if (availableResources.length === 0) {
    return (
      <div className="editor-inspector-struct">
        <p className="editor-inspector__hint">A árbore non ten resources definidos.</p>
      </div>
    )
  }

  // Substitúe a fila `tier-1` polo valor dado e commit denso.
  const setRow = (tier: number, nextCosts: readonly Cost[]): void => {
    const nextRows = rows.map((r) => r.costs)
    nextRows[tier - 1] = nextCosts
    onCommit(packCostPerTier(maxTier, nextRows))
  }

  const clearField = (): void => onCommit(undefined)

  return (
    <div className="editor-inspector-struct editor-inspector-cpt">
      <p className="editor-inspector__hint editor-inspector-cpt__intro">
        {pickText(COST_PER_TIER_STRINGS.headerHelp)}
      </p>
      {rows.length === 1 && (
        <p className="editor-inspector__hint editor-inspector-cpt__single-hint">
          {pickText(COST_PER_TIER_STRINGS.singleRankHint)}
        </p>
      )}
      <ul className="editor-inspector-struct__list editor-inspector-cpt__rows">
        {rows.map((row) => (
          <CostPerTierRowUI
            key={row.tier}
            row={row}
            resources={availableResources}
            onCommit={(next) => setRow(row.tier, next)}
          />
        ))}
      </ul>
      {hasValue && (
        <div className="editor-inspector-cpt__actions">
          <button
            type="button"
            className="editor-inspector-cpt__clear"
            onClick={clearField}
            aria-label={pickText(COST_PER_TIER_STRINGS.clearField)}
            title={pickText(COST_PER_TIER_STRINGS.clearFieldHelp)}
          >
            {pickText(COST_PER_TIER_STRINGS.clearField)}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Fila por rango ──

interface CostPerTierRowUIProps {
  readonly row: CostPerTierRow
  readonly resources: readonly Resource[]
  readonly onCommit: (next: readonly Cost[]) => void
}

function CostPerTierRowUI({ row, resources, onCommit }: CostPerTierRowUIProps): JSX.Element {
  const list = row.costs

  const removeAt = (idx: number): void => {
    onCommit(list.filter((_, i) => i !== idx))
  }
  const editAmount = (idx: number, amount: number): void => {
    onCommit(list.map((c, i) => (i === idx ? { ...c, amount } : c)))
  }
  const editResourceId = (idx: number, resourceId: string): void => {
    onCommit(list.map((c, i) => (i === idx ? { ...c, resourceId } : c)))
  }
  const addCost = (resourceId: string): void => {
    if (resourceId === '') return
    onCommit([...list, { resourceId, amount: 1 }])
  }

  const usedIds = new Set(list.map((c) => c.resourceId))
  const addable = resources.filter((r) => !usedIds.has(r.id))

  const rankName = rankLabel(row.tier)

  return (
    <li className="editor-inspector-cpt__row">
      <div className="editor-inspector-cpt__row-header">
        <span className="editor-inspector-cpt__row-title">{rankName}</span>
      </div>
      {list.length === 0 ? (
        <p className="editor-inspector__hint editor-inspector-cpt__row-nocost">
          {pickText(COST_PER_TIER_STRINGS.noCostThisTier)}
        </p>
      ) : (
        <ul className="editor-inspector-cpt__costs">
          {list.map((cost, idx) => (
            <CostCell
              key={`${cost.resourceId}-${idx}`}
              cost={cost}
              resources={resources}
              onEditResource={(v) => editResourceId(idx, v)}
              onEditAmount={(v) => editAmount(idx, v)}
              onRemove={() => removeAt(idx)}
            />
          ))}
        </ul>
      )}
      {addable.length > 0 && (
        <div className="editor-inspector-struct__add editor-inspector-cpt__add">
          <Select
            value=""
            options={[
              { value: '', label: `— ${pickText(COST_PER_TIER_STRINGS.addResource)} —` },
              ...addable.map((r): SelectOption => ({ value: r.id, label: r.id })),
            ]}
            onChange={addCost}
            ariaLabel={`${pickText(COST_PER_TIER_STRINGS.addResource)} — ${rankName}`}
          />
        </div>
      )}
    </li>
  )
}

// ── Cela de custo (resource + amount + remove) ──

interface CostCellProps {
  readonly cost: Cost
  readonly resources: readonly Resource[]
  readonly onEditResource: (resourceId: string) => void
  readonly onEditAmount: (amount: number) => void
  readonly onRemove: () => void
}

function CostCell({
  cost,
  resources,
  onEditResource,
  onEditAmount,
  onRemove,
}: CostCellProps): JSX.Element {
  const [localAmount, setLocalAmount] = useState(String(cost.amount))
  useEffect(() => setLocalAmount(String(cost.amount)), [cost.amount])

  const commitAmount = (): void => {
    const n = Number.parseFloat(localAmount)
    if (Number.isFinite(n) && n !== cost.amount) onEditAmount(n)
    else setLocalAmount(String(cost.amount))
  }

  return (
    <li className="editor-inspector-struct__row editor-inspector-cpt__cost-cell">
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
            setLocalAmount(String(cost.amount))
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
// ── FIN: CostPerTierEditor ──
