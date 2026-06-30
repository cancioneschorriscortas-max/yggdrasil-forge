// ── INICIO: CanvasOverlay ──
// SVG en posición absoluta encima do SkillTree. Pinta:
//   1. Aneis de TODAS as seleccións (multi-selección — o
//      selectedNodeId único do SkillTree non chega).
//   2. Ghosts dos nodos durante un drag (Operation.preview().nodePositions).
//   3. Rect do marquee (en screen-space directo).
//
// **★ Coas leccións de Agarfal en 7.5b-ii**:
//
//   - O CTM vén do `<g>` interno do SkillTree (que ten o transform
//     pan/zoom), non do `<svg>` raíz. Iso garante que as posicións
//     aliñan EXACTAMENTE co render.
//   - **Aneis e ghosts escalan co zoom**: o radio multiplícase polo
//     factor de escala do CTM. Sin isto, ao facer zoom os aneis
//     quedan do mesmo tamaño que pixels mentres os nodos se fan
//     grandes/pequenos — "pescas o anel por separado do nodo".
//
// `pointer-events: none` para que os clics atravesen ao SkillTree.

import type { Position } from '@yggdrasil-forge/core'
import type { SelectionRef } from '@yggdrasil-forge/editor-core'
import type { JSX } from 'react'
import { docToScreen, getCtmScale } from './internals/screenDocCTM.js'

/**
 * Rectángulo en coordenadas de pantalla (relativo ao contedor do canvas).
 */
export interface OverlayRectPx {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface CanvasOverlayProps {
  /**
   * Elemento co transform pan/zoom (fonte do CTM). null mentres non
   * está montado.
   */
  readonly ctmEl: SVGGraphicsElement | null
  /** Bounding rect do contedor (para converter screen → relative pixels). */
  readonly containerRect: DOMRect | null
  /** Refs seleccionadas (todas, multi-selección). */
  readonly selectedRefs: readonly SelectionRef[]
  /** Documento (para resolver positions dos seleccionados). */
  readonly nodePositions: ReadonlyMap<string, Position>
  /**
   * Ghosts: posicións doc-space dos nodos sendo arrastrados. Se está
   * baleiro ou undefined, non se pintan.
   */
  readonly ghosts?: ReadonlyMap<string, Position>
  /** Marquee rect en screen-space (relativo ao contedor). */
  readonly marqueeRect?: OverlayRectPx
  /**
   * Versión do viewport (incrementa en cada onViewportChange). Forza
   * re-medida do CTM cando o usuario pan/zoom.
   */
  readonly viewportVersion: number
}

/**
 * Radio do anel en doc-space (antes de aplicar a escala do CTM). Ese
 * valor escalado dá o radio en pixels pantalla. 22 doc-units coincide
 * aproximadamente cun nodo "small" (radio ~20) con un pequeno halo.
 */
const RING_RADIUS_DOC = 22
/** Radio dos ghosts en doc-space. */
const GHOST_RADIUS_DOC = 18

export function CanvasOverlay({
  ctmEl,
  containerRect,
  selectedRefs,
  nodePositions,
  ghosts,
  marqueeRect,
  viewportVersion,
}: CanvasOverlayProps): JSX.Element | null {
  // viewportVersion utilízase implícitamente como dep visual: o seu
  // cambio propaga re-render → docToScreen recalcúlase coa nova matriz.
  void viewportVersion

  if (ctmEl === null || containerRect === null) return null

  // **Escala** do CTM actual. Aneis e ghosts deben crecer/decrecer co
  // zoom igual que os nodos (que están dentro do mesmo transform).
  const scale = getCtmScale(ctmEl)
  const ringRadius = RING_RADIUS_DOC * scale
  const ghostRadius = GHOST_RADIUS_DOC * scale

  /** Converte un punto doc-space a screen-space RELATIVO ao contedor. */
  function project(doc: Position): { x: number; y: number } | null {
    if (ctmEl === null || containerRect === null) return null
    const screen = docToScreen(ctmEl, doc)
    if (screen === null) return null
    return { x: screen.x - containerRect.left, y: screen.y - containerRect.top }
  }

  // Aneis de selección.
  const rings: { id: string; x: number; y: number }[] = []
  for (const ref of selectedRefs) {
    if (ref.kind !== 'node') continue
    const pos = nodePositions.get(ref.id)
    if (pos === undefined) continue
    const p = project(pos)
    if (p === null) continue
    rings.push({ id: ref.id, x: p.x, y: p.y })
  }

  // Ghosts durante drag.
  const ghostMarkers: { id: string; x: number; y: number }[] = []
  if (ghosts !== undefined) {
    for (const [id, pos] of ghosts) {
      const p = project(pos)
      if (p === null) continue
      ghostMarkers.push({ id, x: p.x, y: p.y })
    }
  }

  return (
    <svg
      className="editor-canvas-overlay"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {/* Aneis de selección (azul/accent), escalados co CTM. */}
      {rings.map((r) => (
        <circle
          key={`ring-${r.id}`}
          cx={r.x}
          cy={r.y}
          r={ringRadius}
          fill="none"
          stroke="var(--editor-accent)"
          strokeWidth={2}
          opacity={0.9}
        />
      ))}
      {/* Ghosts (semitransparentes; escalados co CTM). */}
      {ghostMarkers.map((g) => (
        <circle
          key={`ghost-${g.id}`}
          cx={g.x}
          cy={g.y}
          r={ghostRadius}
          fill="var(--editor-accent-soft)"
          stroke="var(--editor-accent)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          opacity={0.75}
        />
      ))}
      {/* Marquee rect (selección por área) — en screen-space directo. */}
      {marqueeRect !== undefined && (
        <rect
          x={marqueeRect.x}
          y={marqueeRect.y}
          width={marqueeRect.width}
          height={marqueeRect.height}
          fill="var(--editor-accent-soft)"
          stroke="var(--editor-accent)"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      )}
    </svg>
  )
}
// ── FIN: CanvasOverlay ──
