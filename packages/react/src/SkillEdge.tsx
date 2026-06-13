// ── INICIO: SkillEdge ──
// Compoñente átomo de edge. Renderiza <path> SVG cun `d` derivado
// de EdgePath.points + EdgePath.kind. Compoñente puro (sen hooks).

import type { EdgeDef, EdgePath } from '@yggdrasil-forge/core'
import type { JSX, MouseEvent } from 'react'
import { buildPathD } from './svg-helpers.js'

export interface SkillEdgeProps {
  readonly edgeId: string
  readonly edge: EdgeDef
  readonly path: EdgePath
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
// ── FIN: SkillEdge ──
