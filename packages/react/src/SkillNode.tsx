'use client'

// ── INICIO: SkillNode ──
// Compoñente átomo de nodo. Renderiza <g> con <circle> + <text>.

import type { NodeDef, NodeInstance, NodeState, Position } from '@yggdrasil-forge/core'
import {
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useRef,
} from 'react'
import { useTheme } from './ThemeProvider.js'
import { renderNodeShape, resolveRadius, resolveShape } from './nodeGeometry.js'
import type { Theme } from './theme-types.js'

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

  // F10.3.fix: tematización inline (non via <style> scopeado). Cada cor
  // calcúlase desde useTheme() e aplícase como inline CSS no elemento.
  // exactOptionalPropertyTypes: spread condicional para non emitir
  // `prop: undefined` (rompería con strict 'exactOptionalPropertyTypes').
  const theme = useTheme()
  const fill: string = theme?.colors.nodeFill ?? '#f4f4ef'
  const ring: string | undefined = theme !== null ? ringColorForState(theme, state) : undefined
  const ringWidth: number = theme?.sizes.ringWidth ?? 3
  const textColor: string | undefined = theme?.colors.text
  const fontSize: number | undefined = theme?.sizes.fontSize
  const fontSizeSmall: number | undefined = theme?.sizes.fontSizeSmall

  const shapeStyle: CSSProperties = {
    fill,
    strokeWidth: ringWidth,
    ...(ring !== undefined && { stroke: ring }),
  }
  const labelStyle: CSSProperties = {
    ...(textColor !== undefined && { fill: textColor }),
    ...(fontSize !== undefined && { fontSize }),
  }
  const progressStyle: CSSProperties = {
    ...(textColor !== undefined && { fill: textColor }),
    ...(fontSizeSmall !== undefined && { fontSize: fontSizeSmall }),
  }

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
      {renderNodeShape(shape, radius, shapeStyle)}
      {icon !== undefined && (
        <text
          className="yf-skill-node__icon"
          textAnchor="middle"
          dominantBaseline="central"
          style={labelStyle}
        >
          {icon}
        </text>
      )}
      <text className="yf-skill-node__label" textAnchor="middle" y={labelY} style={labelStyle}>
        {resolveLabel(node)}
      </text>
      {progress !== undefined && (
        <text
          className="yf-skill-node__progress"
          textAnchor="middle"
          y={labelY + 16}
          style={progressStyle}
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

/**
 * Devolve a cor de anel (stroke) para un `NodeState` dado o `Theme`.
 *
 * Mapa (F10.3.fix):
 * - `locked`      → `nodeLocked`
 * - `unlockable`  → `nodeUnlockable`
 * - `unlocked`    → `nodeUnlocked`
 * - `maxed`       → `nodeMaxed`
 * - `in_progress` → `nodeInProgress`
 * - `disabled`, `expired` → `nodeLocked` (convención do tema "minimal":
 *   estes estados non teñen cor específica e caen no fallback locked).
 *
 * Helper puro; exportado para tests.
 */
export function ringColorForState(theme: Theme, state: NodeState): string {
  switch (state) {
    case 'unlockable':
      return theme.colors.nodeUnlockable
    case 'unlocked':
      return theme.colors.nodeUnlocked
    case 'maxed':
      return theme.colors.nodeMaxed
    case 'in_progress':
      return theme.colors.nodeInProgress
    default:
      return theme.colors.nodeLocked
  }
}
// ── FIN: SkillNode ──
