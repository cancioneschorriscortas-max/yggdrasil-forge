import type { MeshElement } from '@yggdrasil-forge/core'
// ── INICIO: MeshOverlay ──
import type { JSX } from 'react'

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
 * Compoñente puro (cero hooks). SSR-safe. Usable como child directo
 * de SVGRenderer ou de calquera `<svg>`.
 */
export function MeshOverlay({ mesh }: MeshOverlayProps): JSX.Element | null {
  if (mesh === undefined || mesh.length === 0) return null

  return (
    <g className="yf-mesh-overlay">{mesh.map((element, idx) => renderElement(element, idx))}</g>
  )
}

function renderElement(element: MeshElement, idx: number): JSX.Element {
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
        />
      )
  }
}
// ── FIN: MeshOverlay ──
