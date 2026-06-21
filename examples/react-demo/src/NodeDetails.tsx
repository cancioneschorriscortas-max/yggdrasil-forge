// ── INICIO: NodeDetails — pestana Node do Inspector ──
// Mostra a identidade dun nodo seleccionado: label, tipo (badge), tier,
// descrición, custos e estado actual. Datos do TreeDef + instancia do
// engine; nada inventado.
import type { Cost, NodeDef, TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import type { JSX } from 'react'
import { useSyncExternalStore } from 'react'

type LocalizedValue = string | Readonly<Record<string, string>>

function resolveLocalized(value: LocalizedValue | undefined, fallback: string): string {
  if (value === undefined) return fallback
  if (typeof value === 'string') return value
  return value.gl ?? value.es ?? value.en ?? Object.values(value)[0] ?? fallback
}

const STATE_LABELS: Readonly<Record<string, string>> = {
  locked: 'Bloqueado',
  unlockable: 'Desbloqueable',
  unlocked: 'Completado',
  in_progress: 'En progreso',
  maxed: 'Máximo',
  excluded: 'Incompatible',
}

function formatCosts(costs: readonly Cost[] | undefined): string {
  if (costs === undefined || costs.length === 0) return '—'
  return costs.map((c) => `${c.amount} ${c.resourceId}`).join(', ')
}

export interface NodeDetailsProps {
  readonly engine: TreeEngine
  readonly treeDef: TreeDef
  readonly selectedNodeId: string | null
}

export function NodeDetails({ engine, treeDef, selectedNodeId }: NodeDetailsProps): JSX.Element {
  // Re-render reactivo: subscribimos ao engine para que o estado/tier do
  // nodo seleccionado se actualice ao desbloquear/bloquear.
  useSyncExternalStore(
    (l) => engine.subscribe(l),
    () => engine.getSnapshot(),
  )

  if (selectedNodeId === null) {
    return <p className="inspector-empty">Selecciona un nodo no lenzo…</p>
  }

  const node: NodeDef | undefined = treeDef.nodes.find((n) => n.id === selectedNodeId)
  if (node === undefined) {
    return <p className="inspector-empty">Nodo descoñecido: {selectedNodeId}</p>
  }

  const inst = engine.getNodeState(node.id)
  const stateKey = inst?.state ?? 'locked'
  const stateLabel = STATE_LABELS[stateKey] ?? stateKey
  const currentTier = inst?.currentTier ?? 0
  const isKeystone = node.type === 'keystone'

  return (
    <div className="node-details">
      <div className="node-details-head">
        <h3 className="node-details-title">{resolveLocalized(node.label, node.id)}</h3>
        <span className={`node-badge${isKeystone ? ' node-badge--keystone' : ''}`}>
          {isKeystone ? 'Keystone' : 'Skill'}
        </span>
      </div>
      <dl className="node-details-grid">
        <dt>Estado</dt>
        <dd>
          <span className={`state-pill state-pill--${stateKey}`}>{stateLabel}</span>
        </dd>
        <dt>Tier</dt>
        <dd>
          {currentTier} / {node.maxTier ?? 1}
        </dd>
        {node.description !== undefined && (
          <>
            <dt>Descrición</dt>
            <dd className="node-details-desc">{resolveLocalized(node.description, '')}</dd>
          </>
        )}
        <dt>Custo</dt>
        <dd>{formatCosts(node.cost)}</dd>
        {node.group !== undefined && (
          <>
            <dt>Grupo</dt>
            <dd>{node.group}</dd>
          </>
        )}
      </dl>
    </div>
  )
}
// ── FIN: NodeDetails ──
