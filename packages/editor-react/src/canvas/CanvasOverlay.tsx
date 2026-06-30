// ── INICIO: CanvasOverlay ──
// SVG en posición absoluta encima do SkillTree. Pinta:
//   1. Aneis de TODAS as seleccións (multi-selección — o
//      selectedNodeId único do SkillTree non chega).
//   2. Ghosts dos nodos durante un drag (Operation.preview().nodePositions).
//   3. Rect do marquee (en screen-space directo).
//
// `pointer-events: none` para que os clics atravesen ao SkillTree
// (excepto cando se queren bloquear no contedor pai, que xestiona o
// pipeline).

import type { Position } from '@yggdrasil-forge/core'
import type { SelectionRef } from '@yggdrasil-forge/editor-core'
import type { JSX } from 'react'
import { docToScreen } from './internals/screenDocCTM.js'

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
  /** SVG do SkillTree (fonte do CTM). null mentres non está montado. */
  readonly svg: SVGSVGElement | null
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

/** Radio do anel de selección en pixels. */
const RING_RADIUS_PX = 22
/** Radio dos ghosts en pixels. */
const GHOST_RADIUS_PX = 18

export function CanvasOverlay({
  svg,
  containerRect,
  selectedRefs,
  nodePositions,
  ghosts,
  marqueeRect,
  viewportVersion,
}: CanvasOverlayProps): JSX.Element | null {
  // Re-medida do CTM cando muda o viewport ou se monta o SVG.
  // O CTM cámbiao internamente o SkillTree; cada vez que cambia
  // viewportVersion (incrementado por onViewportChange), este componente
  // re-renderiza por defecto vía prop change → docToScreen recalcúlase
  // automaticamente. Non hai que tickear nada.
  // (viewportVersion utilízase implícitamente como dep visual — biome
  // pode marcar como unused, pero o seu cambio dispara re-render).
  void viewportVersion

  if (svg === null || containerRect === null) return null

  /** Converte un punto doc-space a screen-space RELATIVO ao contedor. */
  function project(doc: Position): { x: number; y: number } | null {
    if (svg === null || containerRect === null) return null
    const screen = docToScreen(svg, doc)
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
      {/* Aneis de selección (azul/accent). */}
      {rings.map((r) => (
        <circle
          key={`ring-${r.id}`}
          cx={r.x}
          cy={r.y}
          r={RING_RADIUS_PX}
          fill="none"
          stroke="var(--editor-accent)"
          strokeWidth="2"
          opacity="0.9"
        />
      ))}
      {/* Ghosts (semitransparentes; cor accent suave). */}
      {ghostMarkers.map((g) => (
        <circle
          key={`ghost-${g.id}`}
          cx={g.x}
          cy={g.y}
          r={GHOST_RADIUS_PX}
          fill="var(--editor-accent-soft)"
          stroke="var(--editor-accent)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.75"
        />
      ))}
      {/* Marquee rect (selección por área). */}
      {marqueeRect !== undefined && (
        <rect
          x={marqueeRect.x}
          y={marqueeRect.y}
          width={marqueeRect.width}
          height={marqueeRect.height}
          fill="var(--editor-accent-soft)"
          stroke="var(--editor-accent)"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
      )}
    </svg>
  )
}
// ── FIN: CanvasOverlay ──
