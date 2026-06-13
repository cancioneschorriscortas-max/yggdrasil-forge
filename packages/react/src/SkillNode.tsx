// ── INICIO: SkillNode ──
// Compoñente átomo de nodo. Renderiza <g> con <circle> + <text>.
// Compoñente puro (sen hooks; usable tanto en server como en client).

import type { NodeDef, NodeInstance, NodeState, Position } from '@yggdrasil-forge/core'
import type { JSX, KeyboardEvent, MouseEvent } from 'react'

export interface SkillNodeProps {
  /** Definición do nodo (do TreeDef). */
  readonly node: NodeDef

  /**
   * Instancia actual do nodo (do TreeState). Pode ser undefined se
   * o engine aínda non inicializou esta entrada (defensivo).
   */
  readonly instance: NodeInstance | undefined

  /** Posición no layout. */
  readonly position: Position

  /** Callback cando o usuario clica/activa este nodo. */
  readonly onClick?: (nodeId: string) => void
}

const NODE_RADIUS = 24

export function SkillNode({ node, instance, position, onClick }: SkillNodeProps): JSX.Element {
  const state = instance?.state ?? 'locked'
  const tier = instance?.currentTier ?? 0
  const progress = instance?.progress

  const handleClick =
    onClick !== undefined ? (_e: MouseEvent<SVGGElement>) => onClick(node.id) : undefined

  const handleKeyDown =
    onClick !== undefined
      ? (e: KeyboardEvent<SVGGElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick(node.id)
          }
        }
      : undefined

  return (
    <g
      className="yf-skill-node"
      data-node-id={node.id}
      data-state={state}
      data-tier={tier}
      transform={`translate(${position.x},${position.y})`}
      {...(handleClick !== undefined && {
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        tabIndex: 0,
        role: 'button',
        'aria-label': formatAriaLabel(node, state),
      })}
    >
      <circle r={NODE_RADIUS} className="yf-skill-node__circle" />
      <text className="yf-skill-node__label" textAnchor="middle" dominantBaseline="middle">
        {resolveLabel(node)}
      </text>
      {progress !== undefined && (
        <text
          className="yf-skill-node__progress"
          textAnchor="middle"
          dominantBaseline="middle"
          y={NODE_RADIUS + 12}
        >
          {progress}%
        </text>
      )}
    </g>
  )
}

/**
 * Resolve o label do nodo. Se é LocalizedString (Record), devolve un
 * fallback razoable (en 7.4 ThemeProvider proverá locale; en 7.2
 * cero contexto).
 */
function resolveLabel(node: NodeDef): string {
  const lbl = node.label
  if (typeof lbl === 'string') return lbl
  // LocalizedString Record: pick gl > es > en > first value > id como fallback básico (7.2).
  return lbl.gl ?? lbl.es ?? lbl.en ?? Object.values(lbl)[0] ?? node.id
}

/**
 * Constrúe o aria-label do nodo incluíndo o label resoluble + estado
 * actual. Patrón: "{label}, {stateLabel}".
 */
function formatAriaLabel(node: NodeDef, state: NodeState): string {
  return `${resolveLabel(node)}, ${ARIA_STATE_LABELS[state]}`
}

const ARIA_STATE_LABELS: Readonly<Record<NodeState, string>> = {
  locked: 'locked',
  unlockable: 'unlockable',
  in_progress: 'in progress',
  unlocked: 'unlocked',
  maxed: 'maxed',
  disabled: 'disabled',
  expired: 'expired',
}
// ── FIN: SkillNode ──
