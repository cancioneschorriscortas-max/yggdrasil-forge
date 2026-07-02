// ── INICIO: PrerequisitesEditor ──
// Sub-editor para `NodeDef.prerequisites` (Briefing 7.5c-ii fase 2 §3).
//
// **Estrutura da UI** (lese coma unha frase):
//   "Este nodo desbloquéase cando [Todas ▾] destas condicións se cumpren:"
//   - Selector de combinador (Todas/Algunha/Ningunha).
//   - Lista PLANA de condicións (o modelo non permite grupos aniñados).
//   - Cada condición: label localizado + mini-formulario segundo `params`.
//
// **Normalización**:
//   - Ao ler: se `prerequisites` é `UnlockCondition` bare (sen `.conditions`),
//     preséntase como grupo `{type:'all', conditions:[esa]}` para UI uniforme.
//   - Ao gardar: sempre gárdase como grupo. `all` cunha condición é
//     semanticamente idéntico á condición bare (verificado no motor —
//     `all` sobre 1 avalía como esa condición). Iso simplifica o ciclo
//     ler-editar-gardar.
//
// **★ Loop conciencia-voz**: crear un ciclo A→B→A ao editar dispara
// o `prerequisiteCycleValidator` (7.4) → warning en Problems → clic
// selecciona o nodo.
//
// **UnlockRule é lista plana** (verificado en 7.5c-ii fase 2 §0): non
// hai que renderizar recursivamente. O editor é combinador + lista.

import type { NodeDef, Resource, StatDef, UnlockCondition, UnlockRule } from '@yggdrasil-forge/core'
import {
  type ConditionParamSpec,
  authorableConditionTypes,
  getCombinatorDescribe,
  getCombinatorLabel,
  getConditionParams,
  getConditionTypeDescribe,
  getConditionTypeLabel,
  getNodeStateLabel,
} from '@yggdrasil-forge/editor-core'
import { type JSX, useEffect, useState } from 'react'
import { Select, type SelectOption } from '../widgets/Select.js'

export interface PrerequisitesEditorProps {
  readonly value: UnlockRule | undefined
  readonly currentNode: NodeDef
  readonly allNodes: readonly NodeDef[]
  readonly resources: readonly Resource[] | undefined
  readonly stats: readonly StatDef[] | undefined
  readonly onCommit: (next: UnlockRule | undefined) => void
}

/** Normaliza `undefined` ou bare condition a grupo `all`. */
function normalize(v: UnlockRule | undefined): {
  combinator: 'all' | 'any' | 'none'
  conditions: readonly UnlockCondition[]
} {
  if (v === undefined) return { combinator: 'all', conditions: [] }
  if ('conditions' in v && (v.type === 'all' || v.type === 'any' || v.type === 'none')) {
    return { combinator: v.type, conditions: v.conditions }
  }
  // bare UnlockCondition
  return { combinator: 'all', conditions: [v as UnlockCondition] }
}

/** Constrúe un UnlockCondition novo cos valores por defecto do seu tipo. */
function newCondition(
  type: string,
  ctx: { readonly allNodes: readonly NodeDef[]; readonly currentNodeId: string },
): UnlockCondition | null {
  // Escolle un nodeId por defecto que non sexa o actual (para evitar
  // autociclos triviais); se non hai outros, deixa string baleiro.
  const otherNodes = ctx.allNodes.filter((n) => n.id !== ctx.currentNodeId)
  const defaultNodeId = otherNodes[0]?.id ?? ''
  switch (type) {
    case 'node_unlocked':
      return { type: 'node_unlocked', nodeId: defaultNodeId }
    case 'node_maxed':
      return { type: 'node_maxed', nodeId: defaultNodeId }
    case 'node_state':
      return { type: 'node_state', nodeId: defaultNodeId, state: 'unlocked' }
    case 'nodes_count':
      return { type: 'nodes_count', count: 1 }
    case 'resource_min':
      return { type: 'resource_min', resourceId: '', amount: 1 }
    case 'tier_min':
      return { type: 'tier_min', nodeId: defaultNodeId, tier: 1 }
    case 'distance_max':
      return { type: 'distance_max', fromNodeId: defaultNodeId, maxSteps: 1 }
    case 'tag_count':
      return { type: 'tag_count', tag: '', count: 1 }
    case 'progress_min':
      return { type: 'progress_min', nodeId: defaultNodeId, percent: 100 }
    case 'subtree_completion':
      return { type: 'subtree_completion', subtreeId: '', percent: 100 }
    case 'stat_min':
      return { type: 'stat_min', statId: '', amount: 1 }
    case 'time_after':
      return { type: 'time_after', timestamp: Date.now() }
    case 'time_before':
      return { type: 'time_before', timestamp: Date.now() }
    case 'custom':
      return { type: 'custom', evaluator: '' }
    default:
      return null
  }
}

export function PrerequisitesEditor({
  value,
  currentNode,
  allNodes,
  resources,
  stats,
  onCommit,
}: PrerequisitesEditorProps): JSX.Element {
  const { combinator, conditions } = normalize(value)

  const commit = (next: {
    combinator: 'all' | 'any' | 'none'
    conditions: readonly UnlockCondition[]
  }): void => {
    if (next.conditions.length === 0) {
      onCommit(undefined)
      return
    }
    onCommit({ type: next.combinator, conditions: [...next.conditions] } as UnlockRule)
  }

  const changeCombinator = (nextComb: string): void => {
    commit({ combinator: nextComb as 'all' | 'any' | 'none', conditions })
  }

  const addCondition = (type: string): void => {
    if (type === '') return
    const c = newCondition(type, { allNodes, currentNodeId: currentNode.id })
    if (c === null) return
    commit({ combinator, conditions: [...conditions, c] })
  }

  const removeAt = (idx: number): void => {
    commit({
      combinator,
      conditions: conditions.filter((_, i) => i !== idx),
    })
  }

  const updateAt = (idx: number, next: UnlockCondition): void => {
    commit({
      combinator,
      conditions: conditions.map((c, i) => (i === idx ? next : c)),
    })
  }

  // Opcións do combinador (para o Select propio, con describe).
  const combinatorOptions: SelectOption[] = (['all', 'any', 'none'] as const).map((c) => {
    const describe = getCombinatorDescribe(c)
    return {
      value: c,
      label: getCombinatorLabel(c),
      ...(describe !== undefined && { describe }),
    }
  })

  // Opcións do picker de "engadir condición" (14 tipos autorables).
  const conditionAddOptions: SelectOption[] = [
    { value: '', label: '— engadir condición —' },
    ...authorableConditionTypes().map((t): SelectOption => {
      const describe = getConditionTypeDescribe(t)
      return {
        value: t,
        label: getConditionTypeLabel(t),
        ...(describe !== undefined && { describe }),
      }
    }),
  ]

  return (
    <div className="editor-inspector-struct">
      {/* Combinador + prosa introdutoria */}
      <div className="editor-inspector-prereq__intro">
        <span className="editor-inspector-prereq__intro-text">Este nodo desbloquéase cando</span>
        <div className="editor-inspector-prereq__combinator">
          <Select
            value={combinator}
            options={combinatorOptions}
            onChange={changeCombinator}
            ariaLabel="Combinador de condicións"
          />
        </div>
        <span className="editor-inspector-prereq__intro-text">destas condicións se cumpren:</span>
      </div>

      {/* Lista plana */}
      {conditions.length === 0 ? (
        <p className="editor-inspector__hint">Sen condicións (nodo sen prerequisitos).</p>
      ) : (
        <ul className="editor-inspector-struct__list">
          {conditions.map((cond, idx) => (
            <li key={`cond-${idx}-${cond.type}`} className="editor-inspector-prereq__row">
              <div className="editor-inspector-prereq__row-header">
                <span className="editor-inspector-prereq__type-label">
                  {getConditionTypeLabel(cond.type)}
                </span>
                <button
                  type="button"
                  className="editor-inspector-struct__remove"
                  onClick={() => removeAt(idx)}
                  aria-label={`Quitar condición ${cond.type}`}
                >
                  ×
                </button>
              </div>
              <ConditionParams
                condition={cond}
                allNodes={allNodes}
                currentNodeId={currentNode.id}
                resources={resources ?? []}
                stats={stats ?? []}
                onUpdate={(next) => updateAt(idx, next)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Add */}
      <div className="editor-inspector-struct__add">
        <Select
          value=""
          options={conditionAddOptions}
          onChange={addCondition}
          ariaLabel="Engadir condición"
        />
      </div>
    </div>
  )
}

// ── ConditionParams — mini-formulario por condición ──

interface ConditionParamsProps {
  readonly condition: UnlockCondition
  readonly allNodes: readonly NodeDef[]
  readonly currentNodeId: string
  readonly resources: readonly Resource[]
  readonly stats: readonly StatDef[]
  readonly onUpdate: (next: UnlockCondition) => void
}

function ConditionParams({
  condition,
  allNodes,
  currentNodeId,
  resources,
  stats,
  onUpdate,
}: ConditionParamsProps): JSX.Element {
  const params = getConditionParams(condition.type)
  if (params.length === 0) {
    return <p className="editor-inspector__hint">Sen parámetros.</p>
  }
  return (
    <div className="editor-inspector-prereq__params">
      {params.map((spec) => (
        <ParamCell
          key={spec.key}
          spec={spec}
          condition={condition}
          allNodes={allNodes}
          currentNodeId={currentNodeId}
          resources={resources}
          stats={stats}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}

interface ParamCellProps {
  readonly spec: ConditionParamSpec
  readonly condition: UnlockCondition
  readonly allNodes: readonly NodeDef[]
  readonly currentNodeId: string
  readonly resources: readonly Resource[]
  readonly stats: readonly StatDef[]
  readonly onUpdate: (next: UnlockCondition) => void
}

function pickText(loc: ConditionParamSpec['label']): string {
  if (typeof loc === 'string') return loc
  return loc.gl ?? loc.en ?? Object.values(loc)[0] ?? ''
}

function ParamCell({
  spec,
  condition,
  allNodes,
  currentNodeId,
  resources,
  stats,
  onUpdate,
}: ParamCellProps): JSX.Element {
  const label = pickText(spec.label)
  const currentValue = (condition as unknown as Record<string, unknown>)[spec.key]

  const setValue = (v: unknown): void => {
    onUpdate({ ...condition, [spec.key]: v } as UnlockCondition)
  }

  switch (spec.kind) {
    case 'nodeId': {
      const otherNodes = allNodes.filter((n) => n.id !== currentNodeId)
      return (
        <div className="editor-inspector-prereq__param">
          <span className="editor-inspector-prereq__param-label">{label}</span>
          <Select
            value={(currentValue as string) ?? ''}
            options={otherNodes.map((n): SelectOption => ({ value: n.id, label: n.id }))}
            onChange={setValue}
            ariaLabel={label}
          />
        </div>
      )
    }
    case 'resourceId': {
      return (
        <div className="editor-inspector-prereq__param">
          <span className="editor-inspector-prereq__param-label">{label}</span>
          <Select
            value={(currentValue as string) ?? ''}
            options={resources.map((r): SelectOption => ({ value: r.id, label: r.id }))}
            onChange={setValue}
            ariaLabel={label}
          />
        </div>
      )
    }
    case 'statId': {
      return (
        <div className="editor-inspector-prereq__param">
          <span className="editor-inspector-prereq__param-label">{label}</span>
          <Select
            value={(currentValue as string) ?? ''}
            options={stats.map((s): SelectOption => ({ value: s.id, label: s.id }))}
            onChange={setValue}
            ariaLabel={label}
          />
        </div>
      )
    }
    case 'nodeState': {
      const states = [
        'locked',
        'unlockable',
        'in_progress',
        'unlocked',
        'maxed',
        'disabled',
        'expired',
      ] as const
      return (
        <div className="editor-inspector-prereq__param">
          <span className="editor-inspector-prereq__param-label">{label}</span>
          <Select
            value={(currentValue as string) ?? 'unlocked'}
            options={states.map((s): SelectOption => ({ value: s, label: getNodeStateLabel(s) }))}
            onChange={setValue}
            ariaLabel={label}
          />
        </div>
      )
    }
    case 'number':
    case 'percent':
      return (
        <NumberParamCell
          label={label}
          value={(currentValue as number) ?? 0}
          {...(spec.kind === 'percent' && { min: 0, max: 100 })}
          onCommit={setValue}
        />
      )
    case 'tag':
    case 'scope':
    case 'subtreeId':
      return (
        <TextParamCell
          label={label}
          value={(currentValue as string) ?? ''}
          optional={spec.optional === true}
          onCommit={setValue}
        />
      )
    case 'timestamp':
      return (
        <NumberParamCell
          label={label}
          value={(currentValue as number) ?? Date.now()}
          onCommit={setValue}
        />
      )
    case 'code':
      return (
        <TextParamCell
          label={label}
          value={(currentValue as string) ?? ''}
          hint="Avanzado: require código JavaScript / handler propio."
          onCommit={setValue}
        />
      )
    default: {
      const _exhaust: never = spec.kind
      void _exhaust
      return <span />
    }
  }
}

// ── Celas atómicas (commit on blur) ──

function NumberParamCell(props: {
  readonly label: string
  readonly value: number
  readonly min?: number
  readonly max?: number
  readonly onCommit: (v: number) => void
}): JSX.Element {
  const [local, setLocal] = useState(String(props.value))
  useEffect(() => setLocal(String(props.value)), [props.value])
  const commit = (): void => {
    const n = Number.parseFloat(local)
    if (Number.isFinite(n) && n !== props.value) props.onCommit(n)
    else setLocal(String(props.value))
  }
  return (
    <div className="editor-inspector-prereq__param">
      <span className="editor-inspector-prereq__param-label">{props.label}</span>
      <input
        type="number"
        className="editor-inspector-input editor-inspector-struct__num"
        value={local}
        {...(props.min !== undefined && { min: props.min })}
        {...(props.max !== undefined && { max: props.max })}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            setLocal(String(props.value))
            e.currentTarget.blur()
          }
        }}
        aria-label={props.label}
      />
    </div>
  )
}

function TextParamCell(props: {
  readonly label: string
  readonly value: string
  readonly optional?: boolean
  readonly hint?: string
  readonly onCommit: (v: string) => void
}): JSX.Element {
  const [local, setLocal] = useState(props.value)
  useEffect(() => setLocal(props.value), [props.value])
  const commit = (): void => {
    if (local === props.value) return
    props.onCommit(local)
  }
  return (
    <div className="editor-inspector-prereq__param">
      <span className="editor-inspector-prereq__param-label">{props.label}</span>
      <input
        type="text"
        className="editor-inspector-input"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            setLocal(props.value)
            e.currentTarget.blur()
          }
        }}
        aria-label={props.label}
        placeholder={props.optional === true ? '(opcional)' : undefined}
        title={props.hint}
      />
    </div>
  )
}
// ── FIN: PrerequisitesEditor ──
