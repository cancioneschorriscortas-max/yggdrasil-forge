// ── INICIO: svg-helpers ──
// Helpers internos para construír atributos SVG.
//
// NON exportado publicamente. Reutilizado por SkillTree (buildViewBox)
// e SkillEdge (buildPathD).

import type { Bounds, EdgePath } from '@yggdrasil-forge/core'

/**
 * Constrúe o atributo `viewBox` SVG a partir de `bounds + padding`.
 * Se `bounds` é undefined, devolve `'0 0 0 0'` (estado vacío).
 */
export function buildViewBox(bounds: Bounds | undefined, padding: number): string {
  if (bounds === undefined) return '0 0 0 0'
  const x = bounds.minX - padding
  const y = bounds.minY - padding
  const width = bounds.maxX - bounds.minX + padding * 2
  const height = bounds.maxY - bounds.minY + padding * 2
  return `${x} ${y} ${width} ${height}`
}

/**
 * Constrúe o atributo `d` SVG a partir dun EdgePath. Tres formas
 * segundo `EdgePath.kind`:
 * - `'line'` (default): `M x0 y0 L x1 y1`.
 * - `'cubic'`: `M x0 y0 C x1 y1, x2 y2, x3 y3`.
 * - `'polyline'`: `M x0 y0 L x1 y1 L x2 y2 ...`.
 *
 * Se `points` está vacío, devolve `''` (cero throw; SVG path vacío
 * é tratado como cero render polos browsers).
 */
export function buildPathD(path: EdgePath): string {
  const pts = path.points
  /* v8 ignore next 1 -- defensivo: layouts producen polo menos 2 puntos por edge */
  if (pts.length === 0) return ''

  const kind = path.kind ?? 'line'
  const first = pts[0]
  /* v8 ignore next 1 -- TS narrowing: pts[0] sempre definido cando pts.length > 0 */
  if (first === undefined) return '' // (typescript narrowing; cero v8 ignore)

  if (kind === 'cubic' && pts.length >= 4) {
    const p0 = pts[0]
    const p1 = pts[1]
    const p2 = pts[2]
    const p3 = pts[3]
    /* v8 ignore next 3 -- defensivo: length>=4 garante presenza dos 4 puntos */
    if (p0 === undefined || p1 === undefined || p2 === undefined || p3 === undefined) {
      return ''
    }
    return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`
  }

  // 'line' (2 puntos) ou 'polyline' (3+ puntos): tratamento uniforme con M + L*
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    /* v8 ignore next 1 -- TS narrowing: pts[i] sempre definido dentro do range */
    if (p === undefined) continue // (typescript narrowing; cero v8 ignore)
    d += ` L ${p.x} ${p.y}`
  }
  return d
}
// ── FIN: svg-helpers ──
