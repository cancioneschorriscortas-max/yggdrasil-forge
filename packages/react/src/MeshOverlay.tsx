'use client'

import type { MeshElement } from '@yggdrasil-forge/core'
// ── INICIO: MeshOverlay ──
import type { CSSProperties, JSX } from 'react'
import { useTheme } from './ThemeProvider.js'

export interface MeshOverlayProps {
  /**
   * Lista de elementos mesh do layout. Tipicamente
   * `layoutResult.mesh`. Pode ser undefined ou array baleiro; en
   * ambos casos o compoñente devolve null (cero overhead DOM).
   */
  readonly mesh?: readonly MeshElement[]
}

/**
 * Renderiza overlay visual auxiliar do layout. Cada `MeshElement`
 * transformase nun elemento SVG segundo o seu `type`:
 * - `'line'` → `<line x1 y1 x2 y2>`
 * - `'circle'` → `<circle cx cy r>`
 * - `'polygon'` → `<polygon points="x1,y1 x2,y2 ...">`
 *
 * F10.3.fix: usa `useTheme()` para aplicar stroke/strokeWidth inline.
 * Antes era puro (cero hooks); agora ten un único hook.
 */
export function MeshOverlay({ mesh }: MeshOverlayProps): JSX.Element | null {
  const theme = useTheme()
  if (mesh === undefined || mesh.length === 0) return null

  const stroke: string | undefined = theme?.colors.mesh
  const strokeWidth: number | undefined = theme?.sizes.strokeWidth
  const style: CSSProperties = {
    ...(stroke !== undefined && { stroke }),
    ...(strokeWidth !== undefined && { strokeWidth }),
  }

  return (
    <g className="yf-mesh-overlay">
      {mesh.map((element, idx) => renderElement(element, idx, style))}
    </g>
  )
}

function renderElement(element: MeshElement, idx: number, style: CSSProperties): JSX.Element {
  switch (element.type) {
    case 'line':
      return (
        <line
          key={`line-${idx}`}
          className="yf-mesh-overlay__line"
          x1={element.from.x}
          y1={element.from.y}
          x2={element.to.x}
          y2={element.to.y}
          fill="none"
          stroke="currentColor"
          style={style}
        />
      )
    case 'circle':
      return (
        <circle
          key={`circle-${idx}`}
          className="yf-mesh-overlay__circle"
          cx={element.center.x}
          cy={element.center.y}
          r={element.radius}
          fill="none"
          stroke="currentColor"
          style={style}
        />
      )
    case 'polygon':
      return (
        <polygon
          key={`polygon-${idx}`}
          className="yf-mesh-overlay__polygon"
          points={element.points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          style={style}
        />
      )
  }
}
// ── FIN: MeshOverlay ──
