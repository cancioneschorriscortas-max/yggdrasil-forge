// ── INICIO: edgeGeometry ──
// Helpers puros para xeometría de edges. F10.4.fix-arrow:
// `shortenEdgeAtTarget` move o último punto do path cara o anterior
// unha distancia dada, para que o marker-end (frecha) quede visible
// fóra do nodo target en lugar de oculto polo seu fill.

import type { EdgePath, Position } from '@yggdrasil-forge/core'

/**
 * Acorta o EdgePath no extremo target unha distancia `gap` (en
 * unidades do path), interpolando entre o punto final e o anterior.
 *
 * Comportamento por `EdgePath.kind`:
 * - `line` ou indefinido: move o último punto (índice 1) cara o
 *   primeiro (índice 0).
 * - `cubic`: move o punto P3 (índice 3) cara o control point P2
 *   (índice 2). A curva mantén a súa tanxente final.
 * - `polyline`: move o último punto cara o penúltimo.
 *
 * Se `gap >= distancia entre os dous últimos puntos`, devolve o path
 * sen modificar (degeneraría a 0 ou negativo). Defensivo.
 *
 * Helper puro; exportado para tests.
 */
export function shortenEdgeAtTarget(path: EdgePath, gap: number): EdgePath {
  const pts = path.points
  if (pts.length < 2 || gap <= 0) return path

  const lastIdx = pts.length - 1
  const last = pts[lastIdx]
  const prev = pts[lastIdx - 1]
  /* v8 ignore next -- defensivo: length >= 2 garántese arriba */
  if (last === undefined || prev === undefined) return path

  const dx = last.x - prev.x
  const dy = last.y - prev.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= gap || dist === 0) return path

  const ratio = (dist - gap) / dist
  const newLast: Position = {
    x: prev.x + dx * ratio,
    y: prev.y + dy * ratio,
  }

  const newPoints = [...pts.slice(0, lastIdx), newLast]
  return path.kind !== undefined ? { points: newPoints, kind: path.kind } : { points: newPoints }
}
// ── FIN: edgeGeometry ──
