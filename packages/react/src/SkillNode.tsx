'use client'

// ── INICIO: SkillNode ──
// Compoñente átomo de nodo. Renderiza <g> con <circle> + <text>.

import type { NodeDef, NodeInstance, NodeState, Position } from '@yggdrasil-forge/core'
import { type JSX, type KeyboardEvent, type MouseEvent, type PointerEvent, useRef } from 'react'
import { renderNodeShape, resolveRadius, resolveShape } from './nodeGeometry.js'

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

  /**
   * Handler opcional que se dispara cando o usuario mantén premido
   * o nodo durante `longPressDuration` ms sen levantar o pointer.
   * Útil para mobile/touch (long press como gesture de contexto).
   */
  readonly onLongPress?: (nodeId: string) => void

  /**
   * Duración en ms para considerar un long press. Default 700.
   * Cero efecto se `onLongPress` é undefined.
   */
  readonly longPressDuration?: number
}

const DEFAULT_LONG_PRESS_MS = 700

export function SkillNode({
  node,
  instance,
  position,
  onClick,
  onLongPress,
  longPressDuration,
}: SkillNodeProps): JSX.Element {
  const state = instance?.state ?? 'locked'
  const tier = instance?.currentTier ?? 0
  const progress = instance?.progress

  const shape = resolveShape(node)
  const radius = resolveRadius(node)
  const icon = node.icon
  const labelY = radius + 16

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

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelLongPress = (): void => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handlePointerDown =
    onLongPress !== undefined
      ? (_e: PointerEvent<SVGGElement>) => {
          cancelLongPress()
          longPressTimerRef.current = setTimeout(() => {
            onLongPress(node.id)
            longPressTimerRef.current = null
          }, longPressDuration ?? DEFAULT_LONG_PRESS_MS)
        }
      : undefined

  const handlePointerEnd =
    onLongPress !== undefined ? (_e: PointerEvent<SVGGElement>) => cancelLongPress() : undefined

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
      {...(handlePointerDown !== undefined && {
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerEnd,
        onPointerCancel: handlePointerEnd,
        onPointerLeave: handlePointerEnd,
      })}
    >
      {renderNodeShape(shape, radius)}
      {icon !== undefined && (
        <text className="yf-skill-node__icon" textAnchor="middle" dominantBaseline="central">
          {icon}
        </text>
      )}
      <text className="yf-skill-node__label" textAnchor="middle" y={labelY}>
        {resolveLabel(node)}
      </text>
      {progress !== undefined && (
        <text className="yf-skill-node__progress" textAnchor="middle" y={labelY + 16}>
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
