'use client'

// ── INICIO: SkillNode ──
// Compoñente átomo de nodo. Renderiza <g> con <circle> + <text>.

import type { NodeDef, NodeInstance, NodeState, Position } from '@yggdrasil-forge/core'
import {
  type CSSProperties,
  type FocusEvent,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useRef,
  useState,
} from 'react'
import { useTheme } from './ThemeProvider.js'
import { IconGlyph } from './icons/IconGlyph.js'
import { getIcon } from './icons/registry.js'
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

  /**
   * Marca este nodo como **seleccionado** (F10.7). Render: anel de
   * selección exterior con `theme.colors.selected` (fallback a
   * `nodeUnlockable`). Tamén pon `data-selected="true"` no `<g>` raíz.
   *
   * Controlado polo consumidor (vía `SkillTree.selectedNodeId`); este
   * compoñente non xestiona internamente que nodo está seleccionado.
   */
  readonly selected?: boolean

  /**
   * Callback opcional disparado cando o pointer entra/sae do nodo
   * (F10.7). Recibe o `nodeId` ao entrar, `null` ao saír. Permite
   * que o consumidor sincronice un panel lateral, tooltip externo,
   * etc.
   *
   * Ortogonal a `onClick` / `onLongPress`. Cero impacto no pan/zoom
   * do viewport (events de pointer no SVG raíz seguen funcionando).
   */
  readonly onHover?: (nodeId: string | null) => void
}

const DEFAULT_LONG_PRESS_MS = 700

export function SkillNode({
  node,
  instance,
  position,
  onClick,
  onLongPress,
  longPressDuration,
  selected,
  onHover,
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

  // F10.8: typography tokens opcionais do tema. Spread condicional
  // para non emitir `prop: undefined` (rompería exactOptionalPropertyTypes).
  // Aplícase aos `<text>` de label e ao fallback de icono-texto.
  const typography = theme?.typography
  const typographyStyle: CSSProperties = {
    ...(typography?.fontFamily !== undefined && { fontFamily: typography.fontFamily }),
    ...(typography?.fontWeight !== undefined && { fontWeight: typography.fontWeight }),
    ...(typography?.letterSpacing !== undefined && { letterSpacing: typography.letterSpacing }),
    ...(typography?.textTransform !== undefined && { textTransform: typography.textTransform }),
  }

  // F10.5: cor do icono = ThemeColors.icon (opt) ?? text (fallback).
  const iconColor: string | undefined = theme?.colors.icon ?? textColor

  // F10.7: cor do anel de selección/foco. Fallback a `nodeUnlockable`
  // que xa é unha cor accesible/destacada do tema (a do anel
  // "podes desbloquearme"); mantén coherencia visual sen requirir
  // que o consumidor declare unha nova cor.
  const selectedColor: string | undefined = theme?.colors.selected ?? theme?.colors.nodeUnlockable

  // F10.7: estado local de hover/focus para afordancias visuais. Non
  // viaxa ao engine; é puramente UI. `onHover` (callback ao
  // consumidor) é independente — engadímolo cando o pointer entra/sae,
  // independentemente do estado local.
  const [isHovering, setHovering] = useState(false)
  const [isFocused, setFocused] = useState(false)

  // F10.5: resolución do icono — (a) ID rexistrado → IconGlyph;
  // (b) URL (http/https/// relativa) → <image>; (c) calquera outro →
  // <text> (emoji/char, fallback retrocompatible).
  const iconDef = icon !== undefined ? getIcon(icon) : undefined
  const iconIsUrl = icon !== undefined && /^(?:https?:)?\/\//.test(icon)
  // Tamaño do icono SVG: proporcional ao raio. Mantén o oco do emoji
  // anterior (radius=26 daba ~26px de glyph), e escala ao redor diso.
  const iconSize = radius * 1.0

  const shapeStyle: CSSProperties = {
    fill,
    strokeWidth: ringWidth,
    ...(ring !== undefined && { stroke: ring }),
  }
  const labelStyle: CSSProperties = {
    ...(textColor !== undefined && { fill: textColor }),
    ...(fontSize !== undefined && { fontSize }),
    ...typographyStyle,
  }
  const progressStyle: CSSProperties = {
    ...(textColor !== undefined && { fill: textColor }),
    ...(fontSizeSmall !== undefined && { fontSize: fontSizeSmall }),
    ...typographyStyle,
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

  // F10.7: hover/focus handlers. Sempre actívanse (cero impacto se
  // `onHover` non se pasa). O estado local móvese tanto se hai
  // callback como se non — o overlay debúxase segundo o estado.
  const handlePointerEnter = (_e: PointerEvent<SVGGElement>): void => {
    setHovering(true)
    if (onHover !== undefined) onHover(node.id)
  }
  const handlePointerLeave = (e: PointerEvent<SVGGElement>): void => {
    setHovering(false)
    if (onHover !== undefined) onHover(null)
    // Se había un long press en curso, cancélase tamén (mesmo
    // comportamento que tiña handlePointerEnd; mantemos ambos por
    // claridade).
    if (handlePointerEnd !== undefined) handlePointerEnd(e)
  }
  const handleFocus = (_e: FocusEvent<SVGGElement>): void => {
    setFocused(true)
  }
  const handleBlur = (_e: FocusEvent<SVGGElement>): void => {
    setFocused(false)
  }

  // F10.7: cursor de man cando o nodo é interactivo (afordancia
  // descubribilidade). Inline style para que viaxe co tema sen
  // depender de CSS externo.
  const containerStyle: CSSProperties = {
    ...(onClick !== undefined && { cursor: 'pointer' }),
  }

  // F10.7: cálculo do overlay de selección/foco/hover. Orde de
  // prioridade visual: selected > focused > hovering. Cero overlay
  // se ningún. Render como `<circle>` exterior universal (envolve
  // shapes non circulares; pragmático e visualmente coherente).
  const overlayRadius = radius + ringWidth + 4
  let overlay: JSX.Element | null = null
  if (selected === true && selectedColor !== undefined) {
    overlay = (
      <circle
        className="yf-skill-node__selection"
        r={overlayRadius}
        style={{
          fill: 'none',
          stroke: selectedColor,
          strokeWidth: ringWidth,
        }}
      />
    )
  } else if (isFocused && selectedColor !== undefined) {
    // Foco de teclado: mesmo cor que selección pero dashed (distingue
    // visualmente sen requirir nova cor).
    overlay = (
      <circle
        className="yf-skill-node__focus"
        r={overlayRadius}
        style={{
          fill: 'none',
          stroke: selectedColor,
          strokeWidth: ringWidth,
          strokeDasharray: '4 3',
        }}
      />
    )
  } else if (isHovering && textColor !== undefined) {
    // Hover: anel exterior fino sutil. Cor do texto (que xa é parte
    // do tema), opacidade reducida para non competir con selección.
    // Sen glow pesado (briefing §5).
    overlay = (
      <circle
        className="yf-skill-node__hover"
        r={overlayRadius}
        style={{
          fill: 'none',
          stroke: textColor,
          strokeWidth: 1,
          opacity: 0.5,
        }}
      />
    )
  }

  return (
    <g
      className="yf-skill-node"
      data-node-id={node.id}
      data-state={state}
      data-tier={tier}
      {...(selected === true && { 'data-selected': 'true' })}
      {...(isHovering && { 'data-hover': 'true' })}
      {...(isFocused && { 'data-focused': 'true' })}
      transform={`translate(${position.x},${position.y})`}
      style={containerStyle}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
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
      })}
    >
      {overlay}
      {renderNodeShape(shape, radius, shapeStyle)}
      {iconDef !== undefined && (
        <IconGlyph
          def={iconDef}
          size={iconSize}
          {...(iconColor !== undefined && { color: iconColor })}
        />
      )}
      {iconDef === undefined && iconIsUrl && icon !== undefined && (
        <image
          className="yf-skill-node__icon"
          href={icon}
          x={-iconSize / 2}
          y={-iconSize / 2}
          width={iconSize}
          height={iconSize}
        />
      )}
      {iconDef === undefined && !iconIsUrl && icon !== undefined && (
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
