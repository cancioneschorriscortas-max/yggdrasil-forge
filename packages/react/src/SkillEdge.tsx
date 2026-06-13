// ── INICIO: SkillEdge ──
// Compoñente átomo de edge. Renderiza <path> SVG cun `d` derivado
// de EdgePath.points + EdgePath.kind. Compoñente puro (sen hooks).

import type { EdgeDef } from '@yggdrasil-forge/core'
import type { EdgePath } from '@yggdrasil-forge/core'
import type { JSX, MouseEvent } from 'react'

export interface SkillEdgeProps {
  /** ID do edge (mesmo que NodeEdge.id). */
  readonly edgeId: string

  /** Definición do edge (do TreeDef). */
  readonly edge: EdgeDef

  /** Path computado polo layout. */
  readonly path: EdgePath

  /** Callback cando o usuario clica este edge. */
  readonly onClick?: (edgeId: string) => void
}

export function SkillEdge({ edgeId, edge, path, onClick }: SkillEdgeProps): JSX.Element {
  const d = buildPathD(path)

  const handleClick =
    onClick !== undefined ? (_e: MouseEvent<SVGPathElement>) => onClick(edgeId) : undefined

  return (
    <path
      className="yf-skill-edge"
      data-edge-id={edgeId}
      data-source={edge.source}
      data-target={edge.target}
      d={d}
      fill="none"
      stroke="currentColor"
      {...(handleClick !== undefined && { onClick: handleClick })}
    />
  )
}

/**
 * Constrúe o atributo `d` SVG a partir dun EdgePath.
 *
 * - `'line'` (default): M x0 y0 L x1 y1
 * - `'cubic'`: M x0 y0 C x1 y1, x2 y2, x3 y3
 * - `'polyline'`: M x0 y0 L x1 y1 L x2 y2 ... (3+ puntos)
 */
function buildPathD(path: EdgePath): string {
  const pts = path.points
  /* v8 ignore next 1 -- defensivo: layouts producen polo menos 2 puntos por edge */
  if (pts.length === 0) return ''

  const kind = path.kind ?? 'line'
  const first = pts[0]

  if (kind === 'cubic' && pts.length >= 4) {
    const p0 = pts[0]
    const p1 = pts[1]
    const p2 = pts[2]
    const p3 = pts[3]
    /* v8 ignore next 1 -- defensivo: length >= 4 garante acceso */
    if (!p0 || !p1 || !p2 || !p3) return ''
    return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`
  }

  /* v8 ignore next 1 -- defensivo: length > 0 garante first */
  if (!first) return ''
  // 'line' (2 puntos) ou 'polyline' (3+ puntos): tratamento uniforme con M + L*
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    /* v8 ignore next 1 -- defensivo: i < length garante acceso */
    if (!p) continue
    d += ` L ${p.x} ${p.y}`
  }
  return d
}
// ── FIN: SkillEdge ──
