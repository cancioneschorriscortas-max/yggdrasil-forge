// ── INICIO: EffectsEditor ──
// Sub-editor para `node.effects: Effect[]`.
//
// **★ Selector GATED** (briefing §4): a lista de tipos para "Engadir
// effect" sae de `authorablePlainEffectTypes()` (deriva do
// supportManifest). `modify_stat` e `plugin` NUNCA aparecen — son
// UNSUPPORTED. `composite` e `conditional` tampouco — son aniñados e
// requiren sub-editores que aterran na fase 2.
//
// **Tipos planos editables (v1)**: modify_resource, modify_node_state,
// set_node_visibility, unlock_node, set_progress, trigger_event.
//
// **Aniñados (composite, conditional)**: se xa existen no nodo
// (cargados doutra fonte), amósanse como resumo de lectura cun "—
// edición en fase 2 —". Cero edición destructiva.

import type { Effect, Resource } from '@yggdrasil-forge/core'
import { authorablePlainEffectTypes } from '@yggdrasil-forge/editor-core'
import { type JSX, useEffect, useState } from 'react'

export interface EffectsEditorProps {
  readonly value: readonly Effect[] | undefined
  readonly resources: readonly Resource[] | undefined
  readonly allNodeIds: readonly string[]
  readonly onCommit: (next: readonly Effect[]) => void
}

/**
 * Crea un Effect novo cun tipo + valores por defecto. Usado polo
 * selector de "Engadir effect plano".
 */
function createPlainEffect(
  type: string,
  resources: readonly Resource[],
  allNodeIds: readonly string[],
): Effect | null {
  const firstResource = resources[0]?.id ?? ''
  const firstNode = allNodeIds[0] ?? ''
  switch (type) {
    case 'modify_resource':
      return { type: 'modify_resource', resourceId: firstResource, op: '+', amount: 1 }
    case 'modify_node_state':
      return { type: 'modify_node_state', nodeId: firstNode, state: 'unlocked' }
    case 'set_node_visibility':
      return { type: 'set_node_visibility', nodeId: firstNode, visible: true }
    case 'unlock_node':
      return { type: 'unlock_node', nodeId: firstNode }
    case 'set_progress':
      return { type: 'set_progress', nodeId: firstNode, percent: 100 }
    case 'trigger_event':
      return { type: 'trigger_event', eventName: '' }
    default:
      return null
  }
}

export function EffectsEditor({
  value,
  resources,
  allNodeIds,
  onCommit,
}: EffectsEditorProps): JSX.Element {
  const list = value ?? []
  const plainTypes = authorablePlainEffectTypes()

  const removeAt = (idx: number): void => {
    onCommit(list.filter((_, i) => i !== idx))
  }
  const updateAt = (idx: number, next: Effect): void => {
    onCommit(list.map((e, i) => (i === idx ? next : e)))
  }
  const addEffectOfType = (type: string): void => {
    if (type === '') return
    const created = createPlainEffect(type, resources ?? [], allNodeIds)
    if (created === null) return
    onCommit([...list, created])
  }

  return (
    <div className="editor-inspector-struct">
      {list.length === 0 ? (
        <p className="editor-inspector__hint">Sen effects.</p>
      ) : (
        <ul className="editor-inspector-struct__list">
          {list.map((effect, idx) => (
            <EffectRow
              key={`${effect.type}-${idx}`}
              effect={effect}
              resources={resources ?? []}
              allNodeIds={allNodeIds}
              onUpdate={(next) => updateAt(idx, next)}
              onRemove={() => removeAt(idx)}
            />
          ))}
        </ul>
      )}
      <div className="editor-inspector-struct__add">
        <select
          className="editor-inspector-input"
          value=""
          onChange={(e) => addEffectOfType(e.target.value)}
          aria-label="Engadir effect plano"
        >
          <option value="">— engadir effect —</option>
          {plainTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ── EffectRow: cada efecto co seu mini-formulario ──
interface EffectRowProps {
  readonly effect: Effect
  readonly resources: readonly Resource[]
  readonly allNodeIds: readonly string[]
  readonly onUpdate: (next: Effect) => void
  readonly onRemove: () => void
}

function EffectRow({
  effect,
  resources,
  allNodeIds,
  onUpdate,
  onRemove,
}: EffectRowProps): JSX.Element {
  return (
    <li className="editor-inspector-struct__row editor-inspector-struct__row--effect">
      <div className="editor-inspector-struct__effect-type">{effect.type}</div>
      <div className="editor-inspector-struct__effect-params">
        <EffectParams
          effect={effect}
          resources={resources}
          allNodeIds={allNodeIds}
          onUpdate={onUpdate}
        />
      </div>
      <button
        type="button"
        className="editor-inspector-struct__remove"
        onClick={onRemove}
        aria-label={`Quitar effect ${effect.type}`}
      >
        ×
      </button>
    </li>
  )
}

interface EffectParamsProps {
  readonly effect: Effect
  readonly resources: readonly Resource[]
  readonly allNodeIds: readonly string[]
  readonly onUpdate: (next: Effect) => void
}

/** Despacha o mini-formulario por tipo de effect. */
function EffectParams({ effect, resources, allNodeIds, onUpdate }: EffectParamsProps): JSX.Element {
  switch (effect.type) {
    case 'modify_resource':
      return (
        <>
          <select
            className="editor-inspector-input editor-inspector-struct__sel"
            value={effect.resourceId}
            onChange={(e) => onUpdate({ ...effect, resourceId: e.target.value })}
            aria-label="Resource id"
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
          <select
            className="editor-inspector-input"
            value={effect.op}
            onChange={(e) => onUpdate({ ...effect, op: e.target.value as '+' | '-' | '*' })}
            aria-label="Op"
          >
            <option value="+">+</option>
            <option value="-">-</option>
            <option value="*">×</option>
          </select>
          <NumberCell
            value={effect.amount}
            onCommit={(v) => onUpdate({ ...effect, amount: v })}
            label="Amount"
          />
        </>
      )
    case 'modify_node_state':
      return (
        <>
          <NodeIdSelect
            value={effect.nodeId}
            allNodeIds={allNodeIds}
            onChange={(v) => onUpdate({ ...effect, nodeId: v })}
          />
          <select
            className="editor-inspector-input"
            value={effect.state}
            onChange={(e) =>
              onUpdate({
                ...effect,
                state: e.target.value as Effect & { type: 'modify_node_state' } extends infer X
                  ? X extends { state: infer S }
                    ? S
                    : never
                  : never,
              })
            }
            aria-label="State"
          >
            <option value="locked">locked</option>
            <option value="unlockable">unlockable</option>
            <option value="unlocked">unlocked</option>
            <option value="maxed">maxed</option>
          </select>
        </>
      )
    case 'set_node_visibility':
      return (
        <>
          <NodeIdSelect
            value={effect.nodeId}
            allNodeIds={allNodeIds}
            onChange={(v) => onUpdate({ ...effect, nodeId: v })}
          />
          <label className="editor-inspector-struct__check-inline">
            <input
              type="checkbox"
              checked={effect.visible}
              onChange={(e) => onUpdate({ ...effect, visible: e.target.checked })}
              aria-label="Visible"
            />
            visible
          </label>
        </>
      )
    case 'unlock_node':
      return (
        <NodeIdSelect
          value={effect.nodeId}
          allNodeIds={allNodeIds}
          onChange={(v) => onUpdate({ ...effect, nodeId: v })}
        />
      )
    case 'set_progress':
      return (
        <>
          <NodeIdSelect
            value={effect.nodeId}
            allNodeIds={allNodeIds}
            onChange={(v) => onUpdate({ ...effect, nodeId: v })}
          />
          <NumberCell
            value={effect.percent}
            onCommit={(v) => onUpdate({ ...effect, percent: v })}
            label="Percent"
          />
        </>
      )
    case 'trigger_event':
      return (
        <TextCell
          value={effect.eventName}
          onCommit={(v) => onUpdate({ ...effect, eventName: v })}
          label="Event name"
          placeholder="event.name"
        />
      )
    case 'composite':
      return (
        <span className="editor-inspector-struct__nested-hint">
          {effect.effects.length} aniñados · edición en fase 2
        </span>
      )
    case 'conditional':
      return (
        <span className="editor-inspector-struct__nested-hint">
          conditional · edición en fase 2
        </span>
      )
    // modify_stat / plugin son UNSUPPORTED — non deberían aparecer (gate),
    // pero se aparecen por dato externo, mostramos sen edición.
    default:
      return (
        <span className="editor-inspector-struct__nested-hint">
          (tipo non soportado polo editor)
        </span>
      )
  }
}

// ── Componentes auxiliares (selección nodeId, number cell, text cell) ──
interface NodeIdSelectProps {
  readonly value: string
  readonly allNodeIds: readonly string[]
  readonly onChange: (next: string) => void
}
function NodeIdSelect({ value, allNodeIds, onChange }: NodeIdSelectProps): JSX.Element {
  return (
    <select
      className="editor-inspector-input editor-inspector-struct__sel"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Node id"
    >
      {!allNodeIds.includes(value) && value !== '' && (
        <option value={value}>{value} (fora da árbore)</option>
      )}
      {allNodeIds.map((id) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </select>
  )
}

interface NumberCellProps {
  readonly value: number
  readonly onCommit: (next: number) => void
  readonly label: string
}
function NumberCell({ value, onCommit, label }: NumberCellProps): JSX.Element {
  const initial = String(value)
  const [local, setLocal] = useState(initial)
  useEffect(() => setLocal(initial), [initial])
  const commit = (): void => {
    if (local === initial) return
    const parsed = Number(local)
    if (!Number.isFinite(parsed)) {
      setLocal(initial)
      return
    }
    onCommit(parsed)
  }
  return (
    <input
      type="number"
      className="editor-inspector-input editor-inspector-struct__num"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') {
          setLocal(initial)
          e.currentTarget.blur()
        }
      }}
      aria-label={label}
    />
  )
}

interface TextCellProps {
  readonly value: string
  readonly onCommit: (next: string) => void
  readonly label: string
  readonly placeholder?: string
}
function TextCell({ value, onCommit, label, placeholder }: TextCellProps): JSX.Element {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  const commit = (): void => {
    if (local !== value) onCommit(local)
  }
  return (
    <input
      type="text"
      className="editor-inspector-input editor-inspector-struct__text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      {...(placeholder !== undefined && { placeholder })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') {
          setLocal(value)
          e.currentTarget.blur()
        }
      }}
      aria-label={label}
    />
  )
}
// ── FIN: EffectsEditor ──
