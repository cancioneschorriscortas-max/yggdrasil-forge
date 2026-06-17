// ── INICIO: SkillEdge ──
// Compoñente átomo de edge. Renderiza <path> SVG cun `d` derivado
// de EdgePath.points + EdgePath.kind.
//
// F10.3.fix: usa `useTheme()` para aplicar stroke/strokeWidth inline.
// Antes era puro (cero hooks); agora ten un único hook, alleo a SSR.

'use client'

import type { EdgeDef, EdgePath } from '@yggdrasil-forge/core'
import type { CSSProperties, JSX, MouseEvent } from 'react'
import { useTheme } from './ThemeProvider.js'
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

  const theme = useTheme()
  const stroke: string | undefined = theme?.colors.edge
  const strokeWidth: number | undefined = theme?.sizes.strokeWidth
  const style: CSSProperties = {
    ...(stroke !== undefined && { stroke }),
    ...(strokeWidth !== undefined && { strokeWidth }),
  }

  return (
    <path
      className="yf-skill-edge"
      data-edge-id={edgeId}
      data-source={edge.source}
      data-target={edge.target}
      d={d}
      fill="none"
      stroke="currentColor"
      style={style}
      {...(handleClick !== undefined && { onClick: handleClick })}
    />
  )
}
// ── FIN: SkillEdge ──
